from rest_framework import serializers
from .models import EquityAccount, EquityTransaction, EquityNotification
from decimal import Decimal


class EquityAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = EquityAccount
        fields = [
            'id', 'account_name', 'account_number', 'account_type',
            'balance', 'currency', 'is_primary', 'loan_limit', 'created_at'
        ]
        read_only_fields = ['account_number', 'balance', 'created_at']


class EquityTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EquityTransaction
        fields = [
            'id', 'amount', 'transaction_type', 'description',
            'reference', 'balance_after', 'created_at'
        ]


class EquityNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EquityNotification
        fields = ['id', 'title', 'body', 'is_read', 'data', 'created_at']


class AdminAdjustBalanceSerializer(serializers.Serializer):
    account_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    reason = serializers.CharField(max_length=255, required=False, default="Admin adjustment")