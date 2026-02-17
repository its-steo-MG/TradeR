# customercare/consumers.py
import json
import logging
import asyncio
import time
from datetime import datetime
from typing import Optional
from urllib.parse import parse_qs

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from channels.exceptions import StopConsumer
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings

User = get_user_model()
logger = logging.getLogger(__name__)

# === SAFE OPENAI IMPORT ===
openai = None
try:
    import importlib
    openai_module = importlib.import_module("openai")
    openai = openai_module
    if getattr(settings, "OPENAI_API_KEY", None):
        openai.api_key = settings.OPENAI_API_KEY
except Exception as e:
    logger.warning(f"[AI Bot] OpenAI not available: {e}")


class ChatConsumer(AsyncWebsocketConsumer):
    """
    Real-time support chat for regular users
    - JWT via ?token=
    - Auto AI reply: first message + 5min admin silence
    - Rate limit: 1 msg/sec
    - Typing indicators
    - Block detection
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.thread = None
        self.room_group_name: Optional[str] = None
        self.last_message_time = 0.0
        self.min_interval = 1.0  # 1 sec
        self.admin_last_reply: Optional[datetime] = None
        self.ai_task: Optional[asyncio.Task] = None

    # ------------------------------------------------------------------
    # CONNECTION
    # ------------------------------------------------------------------
    async def connect(self):
        self.user = self.scope["user"]
        logger.info(f"[Chat] Connect attempt by user {self.user.id if self.user.is_authenticated else 'anonymous'}")

        if not self.user.is_authenticated:
            logger.warning(f"[Chat] Unauthenticated connect from {self.scope['client'][0]}")
            await self.close(code=4001)  # Unauthorized
            raise StopConsumer()

        self.thread = await self.get_thread()
        if self.thread.is_blocked():
            block_info = self.thread.get_block_message()
            logger.info(f"[Chat] Blocked user {self.user.id} tried to connect")
            await self.send(json.dumps({
                "type": "blocked",
                "block_info": block_info
            }))
            await self.close(code=4003)  # Blocked
            raise StopConsumer()

        self.room_group_name = f"chat_{self.user.id}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        logger.info(f"[Chat] User {self.user.id} connected to {self.room_group_name}")

        # Load history
        messages = await self.get_messages()
        await self.send(json.dumps({
            "type": "chat_history",
            "messages": messages
        }))

        # Mark admin messages as read
        await self.mark_admin_messages_read()

        # Update admin last reply time
        self.admin_last_reply = await self.get_last_admin_reply_time()

        # Start AI monitor (only if no recent admin reply)
        if not self.admin_last_reply or (timezone.now() - self.admin_last_reply).total_seconds() > 300:
            self.ai_task = asyncio.create_task(self.ai_silence_monitor())

    async def disconnect(self, close_code):
        if self.ai_task:
            self.ai_task.cancel()
        if self.room_group_name:
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        logger.info(f"[Chat] User {self.user.id if self.user else 'unknown'} disconnected")

    # ------------------------------------------------------------------
    # RECEIVE FROM CLIENT
    # ------------------------------------------------------------------
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            msg_type = data.get("type")
        except json.JSONDecodeError:
            return

        if msg_type == "message":
            await self.handle_user_message(data.get("content", ""))
        elif msg_type == "typing":
            await self.handle_typing(data.get("is_typing", False))

    async def handle_user_message(self, content: str):
        now = time.time()
        if now - self.last_message_time < self.min_interval:
            await self.send(json.dumps({
                "type": "error",
                "message": "Please wait before sending another message."
            }))
            return
        self.last_message_time = now

        if not content.strip():
            return

        # Save message
        message = await self.create_message(content.strip())
        serialized = await self.serialize_message(message, is_me=True)

        # Broadcast to room (user + admin)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": serialized
            }
        )

        # Trigger AI if needed
        await self.maybe_trigger_ai_reply()

    async def handle_typing(self, is_typing: bool):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "typing",
                "is_typing": is_typing,
                "user_id": self.user.id
            }
        )

    # ------------------------------------------------------------------
    # AI LOGIC
    # ------------------------------------------------------------------
    async def maybe_trigger_ai_reply(self):
        count = await self.get_user_message_count()
        if count == 1:
            await asyncio.sleep(1)  # Natural delay
            await self.send_ai_reply("Hello! How can I assist you today?")

        # Or after 5min silence
        elif self.admin_last_reply:
            silence = (timezone.now() - self.admin_last_reply).total_seconds()
            if silence > 300:  # 5 minutes
                await asyncio.sleep(1)
                await self.send_ai_reply("I'm still here. Let me know how I can help!")

    async def ai_silence_monitor(self):
        """Background task: check every 60s if admin silent >5min"""
        while True:
            try:
                await asyncio.sleep(60)
                if not self.admin_last_reply:
                    continue
                if (timezone.now() - self.admin_last_reply).total_seconds() > 300:
                    await self.send_ai_reply("Just checking in — still need help?")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[AI Monitor] Error: {e}")

    async def send_ai_reply(self, content: str):
        if openai is None:
            logger.warning("[AI] OpenAI not available — skipping auto-reply")
            return

        try:
            response = await openai.ChatCompletion.acreate(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a friendly TradeRiser support bot."},
                    {"role": "user", "content": "Generate a short, helpful reply."}
                ],
                max_tokens=100,
                temperature=0.7,
            )
            ai_content = response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"[AI] API Error: {e}")
            ai_content = content  # fallback

        # Save as system message
        message = await self.create_system_message(ai_content)
        serialized = await self.serialize_message(message, is_me=False, is_system=True)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": serialized
            }
        )

    # ------------------------------------------------------------------
    # CHANNEL LAYER EVENTS
    # ------------------------------------------------------------------
    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    async def typing(self, event):
        if event["user_id"] != self.user.id:  # Don't echo own typing
            await self.send(json.dumps({
                "type": "typing",
                "is_typing": event["is_typing"]
            }))

    # ------------------------------------------------------------------
    # DATABASE HELPERS
    # ------------------------------------------------------------------
    @database_sync_to_async
    def get_thread(self):
        from .models import ChatThread
        return ChatThread.objects.get_or_create(user=self.user)[0]

    @database_sync_to_async
    def get_messages(self, thread=None):
        if thread is None:
            thread = self.thread
        from .models import Message
        msgs = thread.messages.select_related('sender').all()
        return [
            {
                "id": m.id,
                "content": m.content,
                "sent_at": m.sent_at.isoformat(),
                "is_read": m.is_read,
                "is_system": m.is_system,
                "sender": {
                    "username": "TradeRiser Support" if (m.is_system and m.sender is None) 
                               else (m.sender.username if m.sender else "Support"),
                    "is_staff": True
                },
                "is_me": False if (m.is_system or m.sender is None) else (m.sender == self.user)
            }
            for m in msgs
        ]

    @database_sync_to_async
    def create_message(self, content):
        from .models import Message
        return Message.objects.create(
            thread=self.thread,
            sender=self.user,
            content=content
        )

    @database_sync_to_async
    def create_system_message(self, content):
        from .models import Message
        # Use first staff user or fallback
        admin = User.objects.filter(is_staff=True).first()
        return Message.objects.create(
            thread=self.thread,
            sender=admin or self.user,
            content=content,
            is_system=True
        )

    @database_sync_to_async
    def mark_admin_messages_read(self):
        self.thread.messages.filter(sender__is_staff=True, is_read=False).update(is_read=True)

    @database_sync_to_async
    def get_user_message_count(self):
        return self.thread.messages.filter(sender=self.user, is_system=False).count()

    @database_sync_to_async
    def get_last_admin_reply_time(self):
        from .models import Message
        msg = self.thread.messages.filter(sender__is_staff=True, is_system=False).last()
        return msg.sent_at if msg else None

    @database_sync_to_async
    def serialize_message(self, message, is_me: bool, is_system: bool = False):
        return {
            "type": "new_message",
            "id": message.id,
            "content": message.content,
            "sent_at": message.sent_at.isoformat(),
            "is_read": message.is_read,
            "is_system": is_system,
            "is_me": is_me,
            "sender": {
                "username": message.sender.username,
                "is_staff": message.sender.is_staff
            }
        }


# NEW: Admin Consumer for real-time admin panel chat
class AdminChatConsumer(AsyncWebsocketConsumer):
    """
    Real-time chat for admins
    - Staff only (checks is_staff)
    - Joins all active user chat groups on connect
    - Can send/receive to specific user threads
    - Handles typing and messages
    - Use ?user_id=123 to connect to specific thread (optional for multi-thread support)
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.room_groups = []  # List of joined groups (for disconnect)

    # ------------------------------------------------------------------
    # CONNECTION
    # ------------------------------------------------------------------
    async def connect(self):
        self.user = self.scope["user"]
        if not self.user.is_authenticated or not self.user.is_staff:
            logger.warning(f"[AdminChat] Unauthorized connect attempt from {self.scope['client'][0]}")
            await self.close(code=4003)  # Forbidden
            raise StopConsumer()

        await self.accept()
        logger.info(f"[AdminChat] Admin {self.user.id} connected")

        # Join all active threads or specific one
        query_string = self.scope.get("query_string", b"").decode("utf-8")
        query_params = parse_qs(query_string)
        target_user_id = query_params.get("user_id", [None])[0]

        if target_user_id:
            # Join specific user thread
            room_group_name = f"chat_{target_user_id}"
            await self.channel_layer.group_add(room_group_name, self.channel_name)
            self.room_groups.append(room_group_name)
            # Load history for that thread
            thread = await self.get_thread_by_user_id(int(target_user_id))
            messages = await self.get_messages(thread)
            await self.send(json.dumps({
                "type": "chat_history",
                "user_id": target_user_id,
                "messages": messages
            }))
        else:
            # Join all active threads
            active_threads = await self.get_active_threads()
            for thread in active_threads:
                room_group_name = f"chat_{thread.user.id}"
                await self.channel_layer.group_add(room_group_name, self.channel_name)
                self.room_groups.append(room_group_name)

    async def disconnect(self, close_code):
        for group in self.room_groups:
            await self.channel_layer.group_discard(group, self.channel_name)
        logger.info(f"[AdminChat] Admin {self.user.id if self.user else 'unknown'} disconnected")

    # ------------------------------------------------------------------
    # RECEIVE FROM CLIENT
    # ------------------------------------------------------------------
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            msg_type = data.get("type")
        except json.JSONDecodeError:
            return

        if msg_type == "message":
            await self.handle_admin_message(data.get("content", ""), data.get("user_id"))
        elif msg_type == "typing":
            await self.handle_typing(data.get("is_typing", False), data.get("user_id"))

    async def handle_admin_message(self, content: str, target_user_id: int):
        if not content.strip() or not target_user_id:
            return

        thread = await self.get_thread_by_user_id(target_user_id)
        message = await self.create_message(thread, content.strip())
        serialized = await self.serialize_message(message, is_me=True)  # For admin, is_me=True

        room_group_name = f"chat_{target_user_id}"
        await self.channel_layer.group_send(
            room_group_name,
            {
                "type": "chat_message",
                "message": serialized
            }
        )

    async def handle_typing(self, is_typing: bool, target_user_id: int):
        if not target_user_id:
            return

        room_group_name = f"chat_{target_user_id}"
        await self.channel_layer.group_send(
            room_group_name,
            {
                "type": "typing",
                "is_typing": is_typing,
                "user_id": self.user.id  # Admin's ID
            }
        )

    # ------------------------------------------------------------------
    # CHANNEL LAYER EVENTS
    # ------------------------------------------------------------------
    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    async def typing(self, event):
        await self.send(json.dumps({
            "type": "typing",
            "is_typing": event["is_typing"],
            "user_id": event["user_id"]
        }))

    # ------------------------------------------------------------------
    # DATABASE HELPERS
    # ------------------------------------------------------------------
    @database_sync_to_async
    def get_active_threads(self):
        from .models import ChatThread
        return list(ChatThread.objects.filter(is_active=True))

    @database_sync_to_async
    def get_thread_by_user_id(self, user_id):
        from .models import ChatThread
        return ChatThread.objects.get(user_id=user_id)

    @database_sync_to_async
    def get_messages(self, thread):
        from .models import Message
        msgs = thread.messages.select_related('sender').all()
        return [
            {
                "id": m.id,
                "content": m.content,
                "sent_at": m.sent_at.isoformat(),
                "is_read": m.is_read,
                "is_system": m.is_system,
                "sender": {
                    "username": m.sender.username,
                    "is_staff": m.sender.is_staff
                },
                "is_me": m.sender == self.user  # For admin view
            }
            for m in msgs
        ]

    @database_sync_to_async
    def create_message(self, thread, content):
        from .models import Message
        return Message.objects.create(
            thread=thread,
            sender=self.user,
            content=content
        )

    @database_sync_to_async
    def serialize_message(self, message, is_me: bool, is_system: bool = False):
        return {
            "type": "new_message",
            "id": message.id,
            "content": message.content,
            "sent_at": message.sent_at.isoformat(),
            "is_read": message.is_read,
            "is_system": is_system,
            "is_me": is_me,
            "sender": {
                "username": message.sender.username,
                "is_staff": message.sender.is_staff
            }
        }