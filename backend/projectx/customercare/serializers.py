from rest_framework import serializers
from .models import ChatThread, Message, CallSession,AdminEmail
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


# ====================== AUDIO CALL SERIALIZER ======================
class CallSessionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    agent = UserSerializer(read_only=True)

    class Meta:
        model = CallSession
        fields = [
            'id', 
            'user', 
            'status', 
            'started_at', 
            'answered_at', 
            'ended_at',
            'voice_preset', 
            'recording', 
            'agent', 
            'is_missed'
        ]
        read_only_fields = ['id', 'started_at', 'answered_at', 'ended_at', 'recording', 'agent']


# Optional: If you want to show more details in admin/frontend
class CallSessionDetailSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    agent = UserSerializer(read_only=True)
    thread_id = serializers.IntegerField(source='thread.id', read_only=True)

    class Meta:
        model = CallSession
        fields = [
            'id', 'user', 'thread_id', 'status', 'started_at', 'answered_at',
            'ended_at', 'voice_preset', 'recording', 'agent', 'is_missed'
        ]

# ====================== ADMIN EMAIL SERIALIZER ======================
class AdminEmailSerializer(serializers.ModelSerializer):
    sent_by = serializers.ReadOnlyField(source='sent_by.username')
    target_user = serializers.SerializerMethodField()

    class Meta:
        model = AdminEmail
        fields = [
            'id', 'subject', 'message', 'html_message',
            'recipient_type', 'target_user', 'sent_by', 'sent_at'
        ]
        read_only_fields = ['sent_by', 'sent_at']

    def get_target_user(self, obj):
        if obj.target_user:
            return {"id": obj.target_user.id, "username": obj.target_user.username}
        return None