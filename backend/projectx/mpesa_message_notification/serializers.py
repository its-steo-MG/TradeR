from rest_framework import serializers
from .models import MpesaNotification

class MpesaNotificationSerializer(serializers.ModelSerializer):
    mpesa_id = serializers.CharField(source='mpesa_transaction.mpesa_id', read_only=True)
    transaction_type = serializers.CharField(source='mpesa_transaction.transaction_type', read_only=True)
    
    class Meta:
        model = MpesaNotification
        fields = [
            'id',
            'mpesa_id',
            'notification_type',
            'message',
            'caller_id',
            'is_read',
            'created_at',
            'transaction_type'
        ]
        read_only_fields = ['mpesa_id', 'notification_type', 'message', 'caller_id', 'created_at']