# trading/serializers.py
from rest_framework import serializers
from .models import MarketType, Market, TradeType, Robot, UserRobot, Trade, Signal
from django.conf import settings

class RobotSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    effective_price = serializers.SerializerMethodField()
    original_price = serializers.ReadOnlyField(source='price')  # Useful for showing strike-through on frontend

    def get_image(self, obj):
        if obj.image:
            return f"{settings.MEDIA_URL}{obj.image}"
        return None

    def get_effective_price(self, obj):
        return obj.effective_price

    class Meta:
        model = Robot
        fields = [
            'id', 'name', 'description', 'price', 'original_price',
            'discounted_price', 'effective_price', 'available_for_demo',
            'image', 'win_rate'
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

    class Meta:
        model = UserRobot
        fields = ['id', 'robot', 'purchased_at', 'purchased_price']

class TradeSerializer(serializers.ModelSerializer):
    market = MarketSerializer(read_only=True)
    trade_type = TradeTypeSerializer(read_only=True)
    used_robot = RobotSerializer(read_only=True)

    class Meta:
        model = Trade
        fields = '__all__'
        read_only_fields = ['user', 'is_win', 'profit', 'timestamp', 'session_profit_before']

class SignalSerializer(serializers.ModelSerializer):
    market = MarketSerializer(read_only=True)
    timeframe = serializers.SerializerMethodField()

    def get_timeframe(self, obj):
        return "1 minute"  # Always show as 1-minute to users

    class Meta:
        model = Signal
        fields = [
            'id', 'market', 'direction', 'probability',
            'take_profit', 'stop_loss', 'generated_at', 'timeframe',
            'strength', 'current_price'  # Added
        ]