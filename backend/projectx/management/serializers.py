# management/serializers.py
from rest_framework import serializers
from .models import ManagementRequest

class ManagementRequestSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source='user.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    # Force Decimal fields to return as floats (numbers), not strings
    stake = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    target_profit = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    payment_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    current_pnl = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    daily_target_profit = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False, allow_null=True)

    class Meta:
        model = ManagementRequest
        fields = [
            'id', 'management_id', 'user', 'stake', 'target_profit', 'payment_amount',
            'status', 'status_display', 'current_pnl', 'days', 'daily_target_profit',
            'start_date', 'end_date', 'created_at', 'account_type'
        ]
        read_only_fields = ['management_id', 'payment_amount', 'status', 'current_pnl', 'status_display']

class InitiateManagementSerializer(serializers.Serializer):
    stake = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=50)
    target_profit = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=10)
    mpesa_phone = serializers.CharField(max_length=15, min_length=9)
    account_type = serializers.ChoiceField(choices=ManagementRequest.ACCOUNT_TYPES, default='standard')