# customercare/serializers.py
from rest_framework import serializers
from .models import ChatThread, Message
from accounts.serializers import UserSerializer

class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'content', 'sent_at', 'is_read', 'is_system', 'sender', 'is_me']
        read_only_fields = ['id', 'sent_at', 'is_read', 'is_system', 'sender']

    def get_is_me(self, obj):
        return obj.sender == self.context['request'].user


class ChatThreadSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    block_info = serializers.SerializerMethodField()

    class Meta:
        model = ChatThread
        fields = ['id', 'is_active', 'messages', 'block_info']
        read_only_fields = ['id', 'is_active', 'messages']

    def get_block_info(self, obj):
        return obj.get_block_message()