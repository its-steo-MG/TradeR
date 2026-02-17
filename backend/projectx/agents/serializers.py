# agents/serializers.py
from decimal import Decimal
from rest_framework import serializers
from .models import AgentDeposit, AgentWithdrawal, Agent as AgentModel
from accounts.serializers import AccountSerializer as AccountDetailSerializer
from accounts.models import Account
from django.conf import settings


class AgentSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = AgentModel
        fields = [
            'id', 'name', 'method', 'image', 'phone', 'email',
            'mpesa_phone', 'paypal_email', 'paypal_link',
            'bank_name', 'bank_account_name', 'bank_account_number',
            'instructions', 'deposit_rate_kes_to_usd', 'withdrawal_rate_usd_to_kes',
            'location', 'rating', 'reviews', 'min_amount', 'max_amount',
            'response_time', 'verified'
        ]

    def get_image(self, obj):
        if obj.profile_picture:  # ← FIXED: was obj.image
            # For S3: use .url (full public URL)
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None


class AgentDepositSerializer(serializers.ModelSerializer):
    agent = serializers.PrimaryKeyRelatedField(
        queryset=AgentModel.objects.all(),
        required=True,
        error_messages={'required': 'Agent ID is required'}
    )
    account = serializers.PrimaryKeyRelatedField(
        queryset=Account.objects.all(),
        required=True,
        error_messages={'required': 'Account ID is required'}
    )

    screenshot_url = serializers.SerializerMethodField()
    agent_detail = AgentSerializer(source='agent', read_only=True)
    account_detail = AccountDetailSerializer(source='account', read_only=True)

    class Meta:
        model = AgentDeposit
        fields = '__all__'
        read_only_fields = [
            'user', 'amount_usd', 'status', 'verified_at',
            'verified_by', 'created_at', 'payment_method', 'updated_at', 'screenshot_url'
        ]

    def get_screenshot_url(self, obj):
        if obj.screenshot:
            return f"{settings.MEDIA_URL}{obj.screenshot}"
        return None

    def validate(self, data):
        agent = data['agent']
        method = agent.method.lower()
        amount_kes = data['amount_kes']

        # Amount validation
        if amount_kes < Decimal('10'):
            raise serializers.ValidationError({"amount_kes": "Minimum deposit is 10 KES"})
        if agent.min_amount and amount_kes < agent.min_amount:
            raise serializers.ValidationError({"amount_kes": f"Minimum for this agent is {agent.min_amount} KES"})
        if agent.max_amount and amount_kes > agent.max_amount:
            raise serializers.ValidationError({"amount_kes": f"Maximum for this agent is {agent.max_amount} KES"})

        # Proof validation
        if method == 'mpesa':
            code = data.get('transaction_code', '').strip()
            if not code:
                raise serializers.ValidationError({"transaction_code": "M-Pesa code required"})
            if len(code) != 10 or not code.isalnum():
                raise serializers.ValidationError({"transaction_code": "Invalid M-Pesa code"})
            if 'screenshot' not in data or not data['screenshot']:
                raise serializers.ValidationError({"screenshot": "Screenshot required for M-Pesa"})

        elif method == 'paypal':
            txid = data.get('paypal_transaction_id', '').strip()
            if not txid:
                raise serializers.ValidationError({"paypal_transaction_id": "PayPal Tx ID required"})
            if len(txid) < 10:
                raise serializers.ValidationError({"paypal_transaction_id": "Invalid PayPal Tx ID"})

        elif method == 'bank_transfer':
            ref = data.get('bank_reference', '').strip()
            if not ref:
                raise serializers.ValidationError({"bank_reference": "Bank reference required"})
            if 'screenshot' not in data or not data['screenshot']:
                raise serializers.ValidationError({"screenshot": "Screenshot required for Bank Transfer"})

        # DO NOT calculate amount_usd here
        return data

    def create(self, validated_data):
        request = self.context['request']
        user = request.user
        agent = validated_data['agent']

        # CRITICAL: Calculate amount_usd HERE
        amount_kes = validated_data['amount_kes']
        rate = agent.deposit_rate_kes_to_usd
        amount_usd = amount_kes / rate
        amount_usd = amount_usd.quantize(Decimal('0.01'))

        # Set fields
        validated_data['user'] = user
        validated_data['amount_usd'] = amount_usd
        validated_data['payment_method'] = agent.method

        # Create and return
        deposit = AgentDeposit.objects.create(**validated_data)
        return deposit

class AgentWithdrawalSerializer(serializers.ModelSerializer):
    agent = serializers.PrimaryKeyRelatedField(
        queryset=AgentModel.objects.all(),
        required=True,
        error_messages={'required': 'Agent ID is required'}
    )
    account = serializers.PrimaryKeyRelatedField(
        queryset=Account.objects.filter(account_type__in=['standard', 'pro-fx']),
        required=True,
        error_messages={'required': 'Account ID is required'}
    )

    class Meta:
        model = AgentWithdrawal
        fields = '__all__'
        read_only_fields = [
            'user', 'amount_kes', 'status', 'completed_at',
            'created_at', 'updated_at', 'payment_method',
            'otp_code', 'otp_sent_at'
        ]

    def validate(self, data):
        agent = data['agent']
        method = agent.method.lower()

        # === PAYPAL ===
        if method == 'paypal':
            email = data.get('user_paypal_email', '').strip()
            if not email:
                raise serializers.ValidationError({
                    "user_paypal_email": "Your PayPal email is required"
                })
            if "@" not in email:
                raise serializers.ValidationError({
                    "user_paypal_email": "Enter a valid email address"
                })

        # === BANK TRANSFER ===
        elif method == 'bank_transfer':
            required = {
                'user_bank_name': 'Bank name',
                'user_bank_account_name': 'Account name',
                'user_bank_account_number': 'Account number',
            }
            errors = {}
            for field, label in required.items():
                value = data.get(field, '').strip()
                if not value:
                    errors[field] = f"Your {label.lower()} is required"
                data[field] = value

            swift = data.get('user_bank_swift', '').strip()
            if swift and len(swift) not in (8, 11):
                errors['user_bank_swift'] = "SWIFT must be 8 or 11 characters"

            if errors:
                raise serializers.ValidationError(errors)

        # === MPESA (no extra fields needed) ===
        # Just pass through

        # === Amount check
        if data['amount_usd'] < Decimal('10'):
            raise serializers.ValidationError({
                "amount_usd": "Minimum withdrawal is $10"
            })

        return data

    def create(self, validated_data):
        """Auto-fill user + calculated fields"""
        request = self.context['request']
        user = request.user

        # Auto-calculate KES
        amount_usd = validated_data['amount_usd']
        rate = validated_data['agent'].withdrawal_rate_usd_to_kes
        amount_kes = amount_usd * rate
        amount_kes = amount_kes.quantize(Decimal('0.01'))

        # Create instance
        withdrawal = AgentWithdrawal.objects.create(
            user=user,
            payment_method=validated_data['agent'].method,
            amount_kes=amount_kes,
            **validated_data
        )

        return withdrawal