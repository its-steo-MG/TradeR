# serializers.py
from rest_framework import serializers
from .models import User, Account, SuspensionEvidence
from mpesa_simulator.models import MpesaUser  # Import for check

class AccountSerializer(serializers.ModelSerializer):
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Account
        fields = ['id', 'account_type', 'balance']
        read_only_fields = ['id', 'balance']

class SuspensionEvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SuspensionEvidence
        fields = ['id', 'description', 'status', 'reviewed_at']
        read_only_fields = ['id', 'reviewed_at']

class UserSerializer(serializers.ModelSerializer):
    accounts = AccountSerializer(many=True, read_only=True)
    referral_link = serializers.SerializerMethodField()
    # New suspension fields
    suspension_details = serializers.SerializerMethodField()
    evidence_status = serializers.SerializerMethodField()  # For permanent
    mpesa_connected = serializers.SerializerMethodField()  # ← NEW: Check if M-Pesa connected

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'phone',
            'is_sashi', 'is_email_verified', 'accounts', 'is_staff',
            'is_marketo', 'referral_link', 'is_suspended', 'suspension_details', 'evidence_status',
            'mpesa_connected'  # ← Added
        ]
        read_only_fields = [
            'id', 'is_sashi', 'is_email_verified', 'is_staff',
            'is_marketo', 'referral_link', 'is_suspended', 'suspension_details', 'evidence_status',
            'mpesa_connected'  # ← Added
        ]

    def get_referral_link(self, obj):
        if obj.is_marketo and obj.referral_code:
            return f"https://traderiserapp.com/signup/?ref={obj.referral_code}"
        return None

    def get_suspension_details(self, obj):
        if not obj.is_suspended:
            return None
        details = {
            'type': obj.suspension_type,
            'reason': obj.suspension_reason,
            'suspended_at': obj.suspended_at.isoformat() if obj.suspended_at else None,
        }
        if obj.suspension_type == 'temporary' and obj.suspended_until:
            details['until'] = obj.suspended_until.isoformat()
        return details

    def get_evidence_status(self, obj):
        if obj.suspension_type != 'permanent':
            return None
        evidence = obj.suspension_evidence.first()
        if evidence:
            return SuspensionEvidenceSerializer(evidence).data
        return {'status': 'no_evidence'}

    def get_mpesa_connected(self, obj):  # ← NEW method
        return MpesaUser.objects.filter(user=obj).exists()