# trading/serializers.py
from rest_framework import serializers
from .models import MarketType, Market, TradeType, Robot, UserRobot, Trade, Signal
from django.conf import settings


class RobotSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    effective_price = serializers.SerializerMethodField()
    original_price = serializers.ReadOnlyField(source='price')

    def get_image(self, obj):
        if obj.image:
            return f"{settings.MEDIA_URL}{obj.image}"
        return None

    def get_effective_price(self, obj):
        return obj.effective_price

    class Meta:
        model = Robot
        fields = [
            'id',
            'name',
            'description',
            'price',
            'original_price',
            'discounted_price',
            'effective_price',
            'available_for_demo',
            'image',
            'win_rate',
            # Deriv Premium Robot fields
            'is_deriv_robot',
            'deriv_access_key',
            # S-Digit Robot Fields
            'is_s_digit_robot',
            'default_digit_contract_type',
            # ==================== NEW: Bulk Trades AI Fields ====================
            'is_bulk_robot',
            'max_bulk_trades',
        ]


class MarketTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketType
        fields = '__all__'


class MarketSerializer(serializers.ModelSerializer):
    market_type = MarketTypeSerializer(read_only=True)
    profit_multiplier = serializers.DecimalField(
        source='market_type.profit_multiplier',
        max_digits=5,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = Market
        fields = ['id', 'name', 'market_type', 'profit_multiplier']


class TradeTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TradeType
        fields = '__all__'


class UserRobotSerializer(serializers.ModelSerializer):
    robot = RobotSerializer(read_only=True)
    deriv_access_key = serializers.SerializerMethodField()
    effective_win_rate = serializers.SerializerMethodField()

    def get_deriv_access_key(self, obj):
        """Return deriv_access_key only if the robot is a Deriv Premium Robot"""
        if getattr(obj.robot, 'is_deriv_robot', False) and obj.robot.deriv_access_key:
            return obj.robot.deriv_access_key
        return None

    def get_effective_win_rate(self, obj):
        return obj.get_effective_win_rate()

    class Meta:
        model = UserRobot
        fields = [
            'id',
            'robot',
            'purchased_at',
            'purchased_price',
            'win_rate',
            'effective_win_rate',
            'deriv_access_key'
        ]


class TradeSerializer(serializers.ModelSerializer):
    market = MarketSerializer(read_only=True)
    trade_type = TradeTypeSerializer(read_only=True)
    used_robot = RobotSerializer(read_only=True)

    # Digit Trading Fields
    is_digit_trade = serializers.BooleanField(read_only=True)
    digit_contract_type = serializers.CharField(read_only=True)
    digit_barrier = serializers.IntegerField(read_only=True)
    last_digit_outcome = serializers.IntegerField(read_only=True)

    class Meta:
        model = Trade
        fields = '__all__'
        read_only_fields = [
            'user', 
            'is_win', 
            'profit', 
            'timestamp', 
            'session_profit_before',
            'is_digit_trade',
            'digit_contract_type',
            'digit_barrier',
            'last_digit_outcome'
        ]


class SignalSerializer(serializers.ModelSerializer):
    market = MarketSerializer(read_only=True)
    timeframe = serializers.SerializerMethodField()

    def get_timeframe(self, obj):
        return "1 minute"  # Always show as 1-minute to users

    class Meta:
        model = Signal
        fields = [
            'id', 
            'market', 
            'direction', 
            'probability',
            'take_profit', 
            'stop_loss', 
            'generated_at', 
            'timeframe',
            'strength', 
            'current_price'
        ]