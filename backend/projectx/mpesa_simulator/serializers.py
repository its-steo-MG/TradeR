# mpesa_simulator/serializers.py
from rest_framework import serializers
from .models import MpesaUser, MpesaTransaction

class MpesaUserSerializer(serializers.ModelSerializer):
    profile_photo = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = MpesaUser
        fields = ['real_name', 'phone_number', 'balance', 'profile_photo', 'fuliza']
        read_only_fields = ['phone_number', 'balance', 'profile_photo', 'fuliza']

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
            'mpesa_id',               # ← now included in API responses
            'recipient_name',
            'recipient_phone',
            'category',
            'created_at'
        ]