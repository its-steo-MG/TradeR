# wallet/serializers.py
from rest_framework import serializers
from .models import Wallet, WalletTransaction, MpesaNumber, Currency, ExchangeRate, OTPCode
from accounts.serializers import UserSerializer

class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = ['code', 'name', 'symbol', 'is_active']

class ExchangeRateSerializer(serializers.ModelSerializer):
    base_currency = CurrencySerializer(read_only=True)
    target_currency = CurrencySerializer(read_only=True)
    class Meta:
        model = ExchangeRate
        fields = ['base_currency', 'target_currency', 'live_rate', 'admin_withdrawal_rate']

class MpesaNumberSerializer(serializers.ModelSerializer):
    class Meta:
        model = MpesaNumber
        fields = ['phone_number', 'is_verified', 'created_at', 'updated_at']
        read_only_fields = ['is_verified', 'created_at', 'updated_at']

class WalletSerializer(serializers.ModelSerializer):
    account_type = serializers.CharField(source='account.account_type', read_only=True)
    user = UserSerializer(source='account.user', read_only=True)
    currency = CurrencySerializer(read_only=True)
    class Meta:
        model = Wallet
        fields = ['id', 'account', 'wallet_type', 'currency', 'balance', 'account_type', 'user', 'created_at', 'updated_at']
        read_only_fields = ['id', 'balance', 'created_at', 'updated_at']

class WalletTransactionSerializer(serializers.ModelSerializer):
    wallet = WalletSerializer(read_only=True)
    currency = CurrencySerializer(read_only=True)
    target_currency = CurrencySerializer(read_only=True)
    class Meta:
        model = WalletTransaction
        fields = [
            'id', 'wallet', 'transaction_type', 'amount', 'currency',
            'status', 'description', 'reference_id', 'mpesa_phone',
            'exchange_rate_used', 'converted_amount', 'target_currency',
            'created_at', 'completed_at', 'checkout_request_id'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'completed_at', 'checkout_request_id']

class OTPRequestSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    wallet_type = serializers.CharField(default='main')
    account_type = serializers.CharField(default='standard')  # Added for account-specific operations

class OTPVerifySerializer(serializers.Serializer):
    code = serializers.CharField(max_length=6)
    transaction_id = serializers.IntegerField()