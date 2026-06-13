# mpesa_simulator/serializers.py
from rest_framework import serializers
from .models import MpesaUser, MpesaTransaction
from decimal import Decimal


class MpesaUserSerializer(serializers.ModelSerializer):
    profile_photo = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = MpesaUser
        fields = ['real_name', 'phone_number', 'balance', 'fuliza', 'profile_photo']
        read_only_fields = ['phone_number', 'balance', 'fuliza', 'profile_photo']

    def get_profile_photo(self, obj):
        if obj.profile_photo:
            return obj.profile_photo.url
        return None


class MpesaTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MpesaTransaction
        fields = [
            'id',
            'transaction_type',
            'amount',
            'description',
            'reference',
            'mpesa_id',
            'recipient_name',
            'recipient_phone',
            'category',
            'created_at'
        ]


# ==================== NEW SERIALIZER FOR SEND MONEY ====================
class SendMoneyResponseSerializer(serializers.Serializer):
    """Serializer for successful Send Money response"""
    message = serializers.CharField()
    mpesa_id = serializers.CharField()
    recipient_name = serializers.CharField()
    recipient_phone = serializers.CharField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    new_balance = serializers.DecimalField(max_digits=14, decimal_places=2)
    transaction_type = serializers.CharField()
    description = serializers.CharField(allow_blank=True, required=False)


class RecipientLookupSerializer(serializers.Serializer):
    """For frontend to check recipient name before sending"""
    recipient_phone = serializers.CharField(max_length=15)

    def validate_recipient_phone(self, value):
        try:
            user = MpesaUser.objects.get(phone_number=value)
            return {
                'recipient_name': user.real_name,
                'recipient_phone': user.phone_number,
                'exists': True
            }
        except MpesaUser.DoesNotExist:
            raise serializers.ValidationError("This phone number is not registered on M-Pesa")