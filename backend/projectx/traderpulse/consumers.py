# traderpulse/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from .models import FeedItem
from .serializers import FeedItemSerializer
from .utils import calculate_online_count


class PulseConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # === 1. Auth check FIRST ===
        if isinstance(self.scope["user"], AnonymousUser) or not self.scope["user"].is_authenticated:
            # Allow anonymous to VIEW (read-only), but reject if you want login-only
            # For now: ALLOW VIEWING (FOMO engine) — but block posting later
            await self.accept()
            self.user = None
        else:
            self.user = self.scope["user"]
            await self.accept()

        # === 2. NOW safe to set room name ===
        self.room_group_name = "traderpulse_global"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        # === 3. Send history & online count ===
        history = await self.get_recent_feed()
        await self.send(json.dumps({
            "type": "feed_history",
            "posts": history
        }))

        online = calculate_online_count()
        await self.send(json.dumps({
            "type": "online_update",
            "online": online
        }))

        print(f"TraderPulse connected: {'Anonymous (view-only)' if not self.user else self.user.username}")

    async def disconnect(self, close_code):
        # === SAFE: Only discard if room_group_name exists ===
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        # === Only authenticated users can post ===
        if not self.user:
            await self.send(json.dumps({
                "type": "error",
                "message": "Login required to post"
            }))
            return

        try:
            data = json.loads(text_data)
            if data.get("action") == "post" and data.get("content"):
                await self.handle_user_post(data["content"])
        except Exception as e:
            await self.send(json.dumps({"type": "error", "message": str(e)}))

    async def handle_user_post(self, content):
        post = await self.create_real_post(content)
        serialized = FeedItemSerializer(post).data

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "new_post",
                "post": serialized
            }
        )

    # === Channel Layer Events ===
    async def new_post(self, event):
        await self.send(text_data=json.dumps(event["post"]))

    async def online_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "online_update",
            "online": event["online"]
        }))

    # === DB Helpers ===
    @database_sync_to_async
    def get_recent_feed(self):
        posts = FeedItem.objects.select_related('real_user', 'fake_trader').order_by('-created_at')[:50]
        return [FeedItemSerializer(p).data for p in posts]

    @database_sync_to_async
    def create_real_post(self, content):
        return FeedItem.objects.create(
            real_user=self.user,
            text=content.strip(),
            content_type='text',
            is_ai_generated=False,
            likes=0
        )