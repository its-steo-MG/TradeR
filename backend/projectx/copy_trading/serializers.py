# copy_trading/serializers.py
from rest_framework import serializers
from .models import Trader, CopySubscription, CopiedTrade
from django.db.models import Sum
from decimal import Decimal

class TraderSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    win_rate = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    average_return = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    subscriber_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Trader
        fields = [
            'id', 'username', 'bio', 'risk_level', 'min_allocation',
            'performance_fee_percent', 'is_active', 'win_rate',
            'average_return', 'subscriber_count', 'created_at'
        ]
        read_only_fields = ['id', 'username', 'created_at']


class CopySubscriptionSerializer(serializers.ModelSerializer):
    trader = TraderSerializer(read_only=True)
    account_type = serializers.CharField(source='account.account_type', read_only=True)
    current_pnl = serializers.SerializerMethodField()
    copied_trades_count = serializers.SerializerMethodField()

    class Meta:
        model = CopySubscription
        fields = [
            'id', 'account', 'account_type', 'trader', 'allocated_amount',
            'max_drawdown_percent', 'is_active', 'created_at', 'updated_at',
            'current_pnl', 'copied_trades_count'
        ]

    def get_current_pnl(self, obj):
        total = obj.copied_trades.aggregate(total=Sum('profit'))['total']
        return total or Decimal('0.00')

    def get_copied_trades_count(self, obj):
        return obj.copied_trades.count()