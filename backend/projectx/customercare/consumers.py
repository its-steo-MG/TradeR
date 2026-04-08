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
    logger.info(f"[AI] OpenAI library loaded successfully (version: {openai.__version__})")
except Exception as e:
    logger.warning(f"[AI Bot] OpenAI library not available: {e}")


class ChatConsumer(AsyncWebsocketConsumer):
    """
    Real-time support chat - ONLY real admin messages
    No AI bot anymore.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.thread = None
        self.room_group_name: Optional[str] = None
        self.last_message_time = 0.0
        self.min_interval = 1.0

    # ------------------------------------------------------------------
    # CONNECTION
    # ------------------------------------------------------------------
    async def connect(self):
        self.user = self.scope["user"]

        if not self.user.is_authenticated:
            await self.close(code=4001)
            raise StopConsumer()

        self.thread = await self.get_thread()

        if self.thread.is_blocked():
            block_info = self.thread.get_block_message()
            await self.send(json.dumps({"type": "blocked", "block_info": block_info}))
            await self.close(code=4003)
            raise StopConsumer()

        self.room_group_name = f"chat_{self.user.id}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Send chat history
        messages = await self.get_messages()
        await self.send(json.dumps({
            "type": "chat_history",
            "messages": messages
        }))

        await self.mark_admin_messages_read()

    async def disconnect(self, close_code):
        if self.room_group_name:
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

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

        message = await self.create_message(content.strip())
        serialized = await self.serialize_message(message, is_me=True)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": serialized
            }
        )

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
    # CHANNEL LAYER EVENTS
    # ------------------------------------------------------------------
    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    async def typing(self, event):
        if event["user_id"] != self.user.id:
            await self.send(json.dumps({
                "type": "typing",
                "is_typing": event["is_typing"]
            }))

    # ------------------------------------------------------------------
    # DATABASE HELPERS (unchanged)
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
    def mark_admin_messages_read(self):
        self.thread.messages.filter(sender__is_staff=True, is_read=False).update(is_read=True)

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

# ===================================================================
# ====================== CALL CONSUMER =======================
# ===================================================================

class CallConsumer(AsyncWebsocketConsumer):
    """WebRTC Signaling + Call Notifications"""

    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user or not self.user.is_authenticated:
            logger.warning("[CallWS] Unauthenticated connection attempt")
            await self.close(code=4001)
            return

        await self.accept()

        self.is_staff = getattr(self.user, 'is_staff', False)

        self.personal_room = f"call_{self.user.id}"
        await self.channel_layer.group_add(self.personal_room, self.channel_name)

        if self.is_staff:
            await self.channel_layer.group_add("call_center", self.channel_name)
            logger.info(f"[CallWS] Staff {self.user.id} joined call_center")

        await self.send(json.dumps({"type": "connection_established", "is_staff": self.is_staff}))
        logger.info(f"[CallWS] ✅ Connected - User {self.user.id} | Staff: {self.is_staff}")

    async def disconnect(self, close_code):
        if hasattr(self, 'personal_room'):
            await self.channel_layer.group_discard(self.personal_room, self.channel_name)
        if hasattr(self, 'is_staff') and self.is_staff:
            await self.channel_layer.group_discard("call_center", self.channel_name)

        logger.info(f"[CallWS] Disconnected - User {getattr(self.user, 'id', 'unknown')} | Code: {close_code}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            msg_type = data.get("type")
        except json.JSONDecodeError:
            return

        if msg_type == "webrtc_offer":
            await self.handle_webrtc_offer(data)
        elif msg_type == "webrtc_answer":
            await self.handle_webrtc_answer(data)
        elif msg_type == "webrtc_ice":
            await self.handle_webrtc_ice(data)
        elif msg_type == "join_call":
            await self.handle_join_call(data)

    # Group Handlers
    async def new_incoming_call(self, event):
        await self.send(json.dumps({
            "type": "new_incoming_call",
            "call_id": event["call_id"],
            "user": event["user"]
        }))

    async def call_answered(self, event):
        call_id = event["call_id"]
        call_room = f"call_session_{call_id}"
        await self.channel_layer.group_add(call_room, self.channel_name)
        await self.send(json.dumps({
            "type": "call_answered",
            "call_id": call_id,
            "voice_preset": event.get("voice_preset"),
            "agent": event.get("agent")
        }))

    async def call_ended(self, event):
        await self.send(json.dumps(event))

    async def webrtc_offer(self, event):
        await self.send(json.dumps(event))

    async def webrtc_answer(self, event):
        await self.send(json.dumps(event))

    async def webrtc_ice(self, event):
        await self.send(json.dumps(event))

    async def joined_call_room(self, event):
        await self.send(json.dumps(event))

    # Client Actions
    async def handle_webrtc_offer(self, data):
        call_id = data.get("call_id")
        offer = data.get("offer")
        if not call_id or not offer:
            return
        await self.channel_layer.group_send(
            "call_center",
            {"type": "webrtc_offer", "call_id": call_id, "offer": offer, "from_user_id": self.user.id}
        )

    async def handle_webrtc_answer(self, data):
        call_id = data.get("call_id")
        answer = data.get("answer")
        if not call_id or not answer:
            return
        call_room = f"call_session_{call_id}"
        await self.channel_layer.group_send(call_room, {"type": "webrtc_answer", "call_id": call_id, "answer": answer})

    async def handle_webrtc_ice(self, data):
        call_id = data.get("call_id")
        candidate = data.get("candidate")
        if not call_id or not candidate:
            return
        call_room = f"call_session_{call_id}"
        await self.channel_layer.group_send(
            call_room,
            {"type": "webrtc_ice", "call_id": call_id, "candidate": candidate, "from_staff": self.is_staff}
        )

    async def handle_join_call(self, data):
        call_id = data.get("call_id")
        if not call_id:
            return
        call_room = f"call_session_{call_id}"
        await self.channel_layer.group_add(call_room, self.channel_name)
        await self.send(json.dumps({"type": "joined_call_room", "call_id": call_id}))


# ===================================================================
# ====================== ADMIN CHAT CONSUMER ========================
# ===================================================================

class AdminChatConsumer(AsyncWebsocketConsumer):
    """Real-time chat for admins - Staff only"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.room_groups = []

    async def connect(self):
        self.user = self.scope["user"]
        if not self.user.is_authenticated or not self.user.is_staff:
            await self.close(code=4003)
            raise StopConsumer()

        await self.accept()
        logger.info(f"[AdminChat] Admin {self.user.id} connected")

        query_string = self.scope.get("query_string", b"").decode("utf-8")
        query_params = parse_qs(query_string)
        target_user_id = query_params.get("user_id", [None])[0]

        if target_user_id:
            room_group_name = f"chat_{target_user_id}"
            await self.channel_layer.group_add(room_group_name, self.channel_name)
            self.room_groups.append(room_group_name)

            thread = await self.get_thread_by_user_id(int(target_user_id))
            messages = await self.get_messages(thread)
            await self.send(json.dumps({"type": "chat_history", "user_id": target_user_id, "messages": messages}))
        else:
            active_threads = await self.get_active_threads()
            for thread in active_threads:
                room_group_name = f"chat_{thread.user.id}"
                await self.channel_layer.group_add(room_group_name, self.channel_name)
                self.room_groups.append(room_group_name)

    async def disconnect(self, close_code):
        for group in self.room_groups:
            await self.channel_layer.group_discard(group, self.channel_name)

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
        serialized = await self.serialize_message(message, is_me=True)
        room_group_name = f"chat_{target_user_id}"
        await self.channel_layer.group_send(room_group_name, {"type": "chat_message", "message": serialized})

    async def handle_typing(self, is_typing: bool, target_user_id: int):
        if not target_user_id:
            return
        room_group_name = f"chat_{target_user_id}"
        await self.channel_layer.group_send(room_group_name, {"type": "typing", "is_typing": is_typing, "user_id": self.user.id})

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    async def typing(self, event):
        await self.send(json.dumps({"type": "typing", "is_typing": event["is_typing"], "user_id": event["user_id"]}))

    # Database Helpers
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
                    "username": "CustomerCare" if (m.is_system or (m.sender and m.sender.is_staff)) else m.sender.username,
                    "is_staff": True
                },
                "is_me": m.sender == self.user
            }
            for m in msgs
        ]

    @database_sync_to_async
    def create_message(self, thread, content):
        from .models import Message
        return Message.objects.create(thread=thread, sender=self.user, content=content)

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
                "username": "CustomerCare" if (is_system or (message.sender and message.sender.is_staff)) else message.sender.username,
                "is_staff": True
            }
        }