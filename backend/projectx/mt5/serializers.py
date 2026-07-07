from rest_framework import serializers
from accounts.models import Account
from .models import MT5Position
from .constants import get_contract_size


class MT5AccountCreateSerializer(serializers.Serializer):
    """
    Serializer for creating MT5 accounts (Real or Demo).
    """
    account_type = serializers.ChoiceField(
        choices=[('mt5', 'MT5 Real'), ('demo', 'MT5 Demo')],
        help_text="'mt5' = MT5 Real Account, 'demo' = MT5 Demo Account"
    )

    def validate(self, data):
        user = self.context['request'].user
        input_type = data.get('account_type')

        # Check if user has at least one Traderiser account
        has_traderiser = user.accounts.filter(platform='traderiser').exists()
        if not has_traderiser:
            raise serializers.ValidationError(
                "You need to create a Traderiser account first before creating an MT5 account."
            )

        # Map input to internal account_type
        internal_type = 'mt5-demo' if input_type == 'demo' else 'mt5'

        # Check if user already has this MT5 account type
        if user.accounts.filter(platform='mt5', account_type=internal_type).exists():
            account_name = "Real" if input_type == "mt5" else "Demo"
            raise serializers.ValidationError(
                f"You already have an MT5 {account_name} account."
            )

        # Store the internal type for the view to use
        data['internal_account_type'] = internal_type
        return data


class MT5AccountSerializer(serializers.ModelSerializer):
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Account
        fields = [
            'id', 
            'platform', 
            'account_type', 
            'balance',
            'is_wallet_verified', 
            'mt5_login', 
            'mt5_server', 
            'created_at'
        ]
        read_only_fields = ['id', 'platform', 'balance', 'created_at', 'mt5_login', 'mt5_server']


# ====================== MT5 POSITION SERIALIZER ======================
class MT5PositionSerializer(serializers.ModelSerializer):
    profit = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = MT5Position
        fields = [
            'id',
            'symbol',
            'side',
            'volume',
            'open_price',
            'current_price',
            'opened_at',
            'swap',
            'commission',
            'sl',
            'tp',
            'profit',
        ]
        read_only_fields = ['id', 'opened_at', 'profit']

    def get_profit(self, obj):
        """Calculate current unrealized profit/loss — must match calcProfit()
        in mt5-store.ts and the close-view calculation exactly, including
        per-symbol contract size."""
        try:
            direction = 1 if obj.side == 'buy' else -1
            price_diff = float(obj.current_price - obj.open_price) * direction
            contract_size = float(get_contract_size(obj.symbol))
            profit = price_diff * float(obj.volume) * contract_size

            if obj.symbol.endswith('JPY'):
                profit = profit / float(obj.current_price)

            final_profit = profit - float(obj.swap or 0) - float(obj.commission or 0)
            return round(final_profit, 2)
        except Exception:
            return 0.0
