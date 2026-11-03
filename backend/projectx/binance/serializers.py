from rest_framework import serializers
from .models import BinanceWallet, BinanceTransaction, BinanceNotification
from decimal import Decimal


class BinanceWalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = BinanceWallet
        fields = [
            'id', 'label', 'address', 'uid', 'network', 'balance',
            'currency', 'is_primary', 'is_active',
            'verification_status', 'account_tier', 'created_at'
        ]
        read_only_fields = ['address', 'uid', 'balance', 'created_at']


class BinanceTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BinanceTransaction
        fields = [
            'id', 'amount', 'transaction_type', 'description',
            'reference', 'balance_after', 'created_at'
        ]


class BinanceNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = BinanceNotification
        fields = ['id', 'title', 'body', 'is_read', 'data', 'created_at']


class AdminAdjustBinanceBalanceSerializer(serializers.Serializer):
    wallet_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=18, decimal_places=6)
    reason = serializers.CharField(max_length=255, required=False, default="Admin adjustment")
