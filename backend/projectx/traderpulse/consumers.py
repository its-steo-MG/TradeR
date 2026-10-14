# traderpulse/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.db.models import F
from .models import FeedItem
from .serializers import FeedItemSerializer
from .utils import calculate_online_count


class PulseConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        self.user = None if isinstance(user, AnonymousUser) or not getattr(user, "is_authenticated", False) else user

        await self.accept()

        self.room_group_name = "traderpulse_global"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        history = await self.get_recent_feed()
        await self.send(text_data=json.dumps({
            "type": "feed_history",
            "posts": history,
        }))

        online = calculate_online_count()
        await self.send(text_data=json.dumps({
            "type": "online_update",
            "online": online,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except Exception:
            return

        action = data.get("action")

        if action == "like":
            if not self.user:
                await self.send(text_data=json.dumps({"type": "error", "message": "Login required to like"}))
                return
            updated = await self.like_post(data.get("post_id"))
            if updated:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {"type": "like_update", "post_id": str(updated.id), "likes": updated.likes},
                )
            return

        if action == "post":
            if not self.user:
                await self.send(text_data=json.dumps({"type": "error", "message": "Login required to post"}))
                return
            content = (data.get("content") or "").strip()
            image = (data.get("image") or "").strip() or None
            reply_to = (data.get("reply_to") or "").strip()
            if reply_to and not content.startswith("@"):
                content = f"@{reply_to} {content}"
            if content or image:
                post = await self.create_real_post(content or "", image)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {"type": "new_post", "post": post},
                )

    async def new_post(self, event):
        await self.send(text_data=json.dumps(event["post"]))

    async def like_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "like_update",
            "post_id": event["post_id"],
            "likes": event["likes"],
        }))

    async def online_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "online_update",
            "online": event["online"],
        }))

    @database_sync_to_async
    def get_recent_feed(self):
        posts = (
            FeedItem.objects
            .select_related("real_user", "fake_trader")
            .order_by("-created_at")[:50]
        )
        return FeedItemSerializer(posts, many=True).data

    @database_sync_to_async
    def create_real_post(self, content, image=None):
        post = FeedItem.objects.create(
            real_user=self.user,
            text=(content or "").strip() or "📸",
            image=image,
            content_type="image" if image else "text",
            is_ai_generated=False,
            likes=0,
        )
        post = FeedItem.objects.select_related("real_user", "fake_trader").get(pk=post.pk)
        return FeedItemSerializer(post).data

    @database_sync_to_async
    def like_post(self, post_id):
        if not post_id:
            return None
        FeedItem.objects.filter(pk=post_id).update(likes=F("likes") + 1)
        return FeedItem.objects.filter(pk=post_id).first()
