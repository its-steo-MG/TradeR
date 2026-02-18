# traderpulse/serializers.py
from rest_framework import serializers
from .models import FeedItem, FakeTrader
from accounts.serializers import UserSerializer  # Your existing UserSerializer


class FakeTraderSerializer(serializers.ModelSerializer):
    """Used when post is from AI/fake trader"""
    class Meta:
        model = FakeTrader
        fields = [
            'id',
            'name',
            'username',
            'country',
            'country_flag',
            'avatar_url',
            'bio',
            'profit_fake',
            'is_premium'
        ]


class FeedItemSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()
    sender_type = serializers.SerializerMethodField()  # 'real' or 'fake'
    time_ago = serializers.SerializerMethodField()
    can_like = serializers.SerializerMethodField()

    class Meta:
        model = FeedItem
        fields = [
            'id',
            'sender',
            'sender_type',
            'text',
            'image',
            'video',
            'content_type',
            'likes',
            'created_at',
            'time_ago',
            'can_like',
            'is_ai_generated'
        ]
        read_only_fields = fields  # All read-only from frontend

    def get_sender(self, obj):
        if obj.real_user:
            # Use your existing clean UserSerializer from accounts
            return UserSerializer(obj.real_user, context=self.context).data
        elif obj.fake_trader:
            return FakeTraderSerializer(obj.fake_trader).data
        return None

    def get_sender_type(self, obj):
        if obj.real_user:
            return "real"
        elif obj.fake_trader:
            return "fake"
        return "unknown"

    def get_time_ago(self, obj):
        from django.utils.timesince import timesince
        return timesince(obj.created_at) + " ago"

    def get_can_like(self, obj):
        # Real users can like posts
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return True
        return False