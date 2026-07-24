from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from accounts.models import Account
from storages.backends.s3boto3 import S3Boto3Storage

# ==================== SHARED CHOICES ====================
DIGIT_CONTRACT_TYPES = [
    ('matches', 'Matches'),
    ('differs', 'Differs'),
    ('even', 'Even'),
    ('odd', 'Odd'),
    ('over', 'Over'),
    ('under', 'Under'),
]


class MarketType(models.Model):
    name = models.CharField(max_length=50, unique=True)
    profit_multiplier = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('1.85'),
        validators=[MinValueValidator(Decimal('1.00'))]
    )

    def __str__(self):
        return self.name


class Market(models.Model):
    name = models.CharField(max_length=50, unique=True)
    market_type = models.ForeignKey(MarketType, on_delete=models.PROTECT, related_name='markets')
    display_name = models.CharField(max_length=100, blank=True, null=True)
    volatility_index = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return self.name

    @property
    def profit_multiplier(self):
        return self.market_type.profit_multiplier


class TradeType(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name


class Robot(models.Model):
    name = models.CharField(max_length=100, unique=True)
    image = models.ImageField(upload_to='robots/', storage=S3Boto3Storage(), null=True, blank=True)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    discounted_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    available_for_demo = models.BooleanField(default=True)
    win_rate = models.IntegerField(default=50, validators=[MinValueValidator(0), MaxValueValidator(100)])

    # Deriv Premium Robot fields
    is_deriv_robot = models.BooleanField(default=False, help_text="Check this if this is a Deriv Premium Robot")
    deriv_access_key = models.CharField(max_length=255, blank=True, null=True,
                                        help_text="Secret access key for Deriv bot. Only fill for Deriv Premium Robots.")

    # ==================== S-DIGIT ROBOT FIELDS ====================
    is_s_digit_robot = models.BooleanField(
        default=False,
        help_text="This is an S-Digit Robot (uses strong Sashi bias: 90% for sashi users)"
    )
    default_digit_contract_type = models.CharField(
        max_length=10,
        choices=DIGIT_CONTRACT_TYPES,
        null=True,
        blank=True,
        help_text="Optional default contract type for this robot (over, under, matches, etc.)"
    )

    # ==================== BULK TRADES AI ROBOT FIELDS ====================
    is_bulk_robot = models.BooleanField(
        default=False,
        help_text="This is a Bulk Trades AI Robot (can place multiple trades in one request)"
    )
    max_bulk_trades = models.PositiveIntegerField(
        default=10,
        validators=[MinValueValidator(1), MaxValueValidator(50)],
        help_text="Maximum number of trades this robot can place in one bulk request (admin can change)"
    )

    def __str__(self):
        return self.name

    @property
    def effective_price(self):
        return self.discounted_price if self.discounted_price is not None else self.price


class UserRobot(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='user_robots')
    robot = models.ForeignKey(Robot, on_delete=models.PROTECT)
    purchased_at = models.DateTimeField(auto_now_add=True)
    purchased_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        unique_together = ('user', 'robot')

    def __str__(self):
        return f"{self.user.username} - {self.robot.name}"


class TradingSetting(models.Model):
    martingale_multiplier = models.PositiveIntegerField(default=2)

    @classmethod
    def get_instance(cls):
        instance, _ = cls.objects.get_or_create(id=1)
        return instance


class Trade(models.Model):
    DIRECTIONS = [
        ('buy', 'Buy/Rise/Touch'),
        ('sell', 'Sell/Fall/No Touch'),
    ]

    # ==================== DIGIT TRADING FIELDS ====================
    DIGIT_CONTRACT_TYPES = DIGIT_CONTRACT_TYPES  # Reference the shared choices

    # Regular trading fields
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='trades')
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='trades')
    market = models.ForeignKey(Market, on_delete=models.PROTECT)
    trade_type = models.ForeignKey(TradeType, on_delete=models.PROTECT)
    direction = models.CharField(max_length=10, choices=DIRECTIONS, null=True, blank=True)

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_win = models.BooleanField()
    profit = models.DecimalField(max_digits=12, decimal_places=2)
    timestamp = models.DateTimeField(auto_now_add=True)

    used_martingale = models.BooleanField(default=False)
    martingale_level = models.PositiveIntegerField(default=0)
    used_robot = models.ForeignKey(Robot, on_delete=models.SET_NULL, null=True, blank=True)
    session_profit_before = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))

    is_demo = models.BooleanField(default=False)
    is_copied = models.BooleanField(default=False)

    entry_spot = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    exit_spot = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    current_spot = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # Digit Trading Fields
    is_digit_trade = models.BooleanField(default=False, help_text="True if this is a digit (S Digit) trade")
    digit_contract_type = models.CharField(
        max_length=10,
        choices=DIGIT_CONTRACT_TYPES,
        null=True,
        blank=True,
        help_text="matches, differs, even, odd, over, under"
    )
    digit_barrier = models.PositiveIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
        help_text="Barrier digit 0-9 for Over/Under/Matches"
    )
    last_digit_outcome = models.PositiveIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
        help_text="The actual last digit that appeared (0-9)"
    )

    def __str__(self):
        if self.is_digit_trade and self.digit_contract_type:
            return f"{self.user.username} - S DIGIT {self.digit_contract_type.upper()} - {'Win' if self.is_win else 'Loss'}"
        return f"{self.user.username} - {self.market.name} - {self.direction} - {'Win' if self.is_win else 'Loss'}"


class Signal(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='signals')
    market = models.ForeignKey(Market, on_delete=models.PROTECT)
    direction = models.CharField(max_length=10, choices=Trade.DIRECTIONS)
    probability = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(100)])
    take_profit = models.DecimalField(max_digits=12, decimal_places=5)
    stop_loss = models.DecimalField(max_digits=12, decimal_places=5)
    generated_at = models.DateTimeField(auto_now_add=True)
    strength = models.FloatField(default=0.0)
    current_price = models.DecimalField(max_digits=12, decimal_places=5, default=Decimal('0.00000'))

    def __str__(self):
        return f"{self.user.username} - {self.market.name} - {self.direction} - Prob: {self.probability}%"