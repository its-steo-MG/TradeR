import random
from decimal import Decimal
from django.db import models, transaction
from django.utils import timezone
from accounts.models import Account, User
from wallet.models import Wallet, Currency
from dashboard.models import Transaction
from django.core.validators import MinValueValidator, MaxValueValidator
from storages.backends.s3boto3 import S3Boto3Storage
import logging

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────
# SHARED CHOICES
# ──────────────────────────────────────────────────────────────
TIME_FRAMES = [
    ('M1', '1 Minute'),
    ('M5', '5 Minutes'),
    ('M15', '15 Minutes'),
    ('H1', '1 Hour'),
    ('H4', '4 Hours'),
    ('D1', '24 Hours'),
]


class ForexPair(models.Model):
    name = models.CharField(max_length=10, unique=True)
    base_currency = models.CharField(max_length=3)
    quote_currency = models.CharField(max_length=3)
    pip_value = models.DecimalField(max_digits=10, decimal_places=5, default=Decimal('0.0001'))
    contract_size = models.IntegerField(default=100000)
    spread = models.DecimalField(max_digits=10, decimal_places=5, default=Decimal('0.0001'))
    base_simulation_price = models.DecimalField(max_digits=10, decimal_places=5, default=Decimal('1.1000'))
    default_time_frame = models.CharField(max_length=3, choices=TIME_FRAMES, default='M1')

    def __str__(self):
        return self.name

    def get_current_price(self, entry_time=None, is_sashi=False, direction='buy', time_frame='M1'):
        """
        Improved MT5-style price simulation with stronger Sashi advantage.
        """
        if not entry_time:
            entry_time = timezone.now()

        minutes_passed = (timezone.now() - entry_time).total_seconds() / 60
        time_frame_multiplier = {
            'M1': 1, 'M5': 5, 'M15': 15, 'H1': 60, 'H4': 240, 'D1': 1440,
        }
        volatility_scale = Decimal(str(time_frame_multiplier.get(time_frame, 1) / 60))

        # Sashi users get better conditions
        if is_sashi:
            if minutes_passed >= 25 * time_frame_multiplier.get(time_frame, 1) / 60:
                return self.base_simulation_price + Decimal('0.0025') if direction == 'buy' else self.base_simulation_price - Decimal('0.0025')
            if random.random() < 0.08:
                return max(self.base_simulation_price - Decimal('0.0004') * volatility_scale, Decimal('0.0001'))
        else:
            # Normal users
            if minutes_passed >= random.uniform(8, 18) * (time_frame_multiplier.get(time_frame, 1) / 60):
                return self.base_simulation_price - Decimal('0.0022') if direction == 'buy' else self.base_simulation_price + Decimal('0.0022')

        rand_vol = Decimal(str(random.uniform(-0.0006, 0.0006)))
        volatility = rand_vol * volatility_scale

        return max(self.base_simulation_price + volatility, Decimal('0.0001'))


class Position(models.Model):
    DIRECTIONS = [('buy', 'Buy'), ('sell', 'Sell')]
    STATUSES = [('open', 'Open'), ('closed', 'Closed')]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='forex_positions')
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='forex_positions')
    pair = models.ForeignKey(ForexPair, on_delete=models.PROTECT)
    direction = models.CharField(max_length=4, choices=DIRECTIONS)
    volume_lots = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.01'))
    entry_price = models.DecimalField(max_digits=10, decimal_places=5)
    entry_time = models.DateTimeField(default=timezone.now)
    sl = models.DecimalField(max_digits=10, decimal_places=5, null=True, blank=True)
    tp = models.DecimalField(max_digits=10, decimal_places=5, null=True, blank=True)
    close_price = models.DecimalField(max_digits=10, decimal_places=5, null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    ea_robot = models.ForeignKey(
        'UserRobot',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='opened_positions'
    )

    floating_p_l = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=6, choices=STATUSES, default='open')
    leverage = models.IntegerField(default=500)
    time_frame = models.CharField(max_length=3, choices=TIME_FRAMES, default='M1')

    class Meta:
        ordering = ['-entry_time']

    def __str__(self):
        return f"{self.user.username} - {self.pair.name} {self.direction} ({self.status})"

    def calculate_margin(self):
        return (self.volume_lots * Decimal(self.pair.contract_size) * self.entry_price) / Decimal(self.leverage)

    def update_floating_p_l(self, current_price=None, wallet_balance=None):
        if self.status == 'closed':
            return

        if not current_price:
            current_price = self.pair.get_current_price(
                self.entry_time,
                is_sashi=self.user.is_sashi,
                direction=self.direction,
                time_frame=self.time_frame
            )

        current_price = Decimal(str(current_price))
        pip_value = self.pair.pip_value

        pip_delta = (current_price - self.entry_price) / pip_value if self.direction == 'buy' else (self.entry_price - current_price) / pip_value

        self.floating_p_l = (pip_delta * self.volume_lots * Decimal(self.pair.contract_size) * pip_value) - \
                           (self.pair.spread * self.volume_lots * Decimal(self.pair.contract_size) * pip_value)

        self.save(update_fields=['floating_p_l'])

        # SL/TP Check
        if self.sl and ((current_price <= self.sl and self.direction == 'buy') or 
                       (current_price >= self.sl and self.direction == 'sell')):
            self.close_position(current_price, is_auto=True, close_reason='sl')
        elif self.tp and ((current_price >= self.tp and self.direction == 'buy') or 
                         (current_price <= self.tp and self.direction == 'sell')):
            self.close_position(current_price, is_auto=True, close_reason='tp')

    def close_position(self, current_price, is_auto=False, close_reason='manual'):
        if self.status == 'closed':
            return None

        current_price = Decimal(str(current_price))
        realized_p_l = Decimal('0.00')

        try:
            self.update_floating_p_l(current_price)
            realized_p_l = self.floating_p_l

            # Sashi adjustment (reduced loss for sashi users)
            if self.user.is_sashi and realized_p_l < 0:
                adjusted_loss = abs(realized_p_l) * Decimal('0.9')
                realized_p_l = -adjusted_loss
                Transaction.objects.create(
                    account=self.account,
                    amount=adjusted_loss,
                    transaction_type='sashi_adjustment',
                    description=f'Sashi adjustment for {self.pair.name}'
                )

            usd = Currency.objects.get(code='USD')
            wallet = Wallet.objects.get(account=self.account, wallet_type='main', currency=usd)
            initial_margin = self.calculate_margin()

            if realized_p_l < 0 and -realized_p_l > wallet.balance:
                realized_p_l = -wallet.balance

            with transaction.atomic():
                wallet.balance += initial_margin + realized_p_l
                wallet.save()

                trans_type = 'profit' if realized_p_l > 0 else 'loss'
                Transaction.objects.create(
                    account=self.account,
                    amount=realized_p_l,
                    transaction_type=trans_type,
                    description=f'Forex close: {self.pair.name} ({close_reason})'
                )

                try:
                    ForexTrade.objects.create(
                        position=self,
                        close_price=current_price,
                        realized_p_l=realized_p_l,
                        close_time=timezone.now(),
                        close_reason=close_reason
                    )
                except Exception:
                    pass

            self.status = 'closed'
            self.floating_p_l = Decimal('0.00')
            self.close_price = current_price
            self.closed_at = timezone.now()
            self.save(update_fields=['status', 'floating_p_l', 'close_price', 'closed_at'])

            return True

        except Exception as e:
            logger.error(f"Error closing position {self.id}: {e}")
            return False

    def check_margin_call(self, wallet_balance):
        if self.user.is_sashi or self.status == 'closed':
            return False
        return self.floating_p_l <= 0 and abs(self.floating_p_l) >= wallet_balance


class ForexTrade(models.Model):
    position = models.OneToOneField(Position, on_delete=models.CASCADE, related_name='trade')
    close_price = models.DecimalField(max_digits=10, decimal_places=5)
    realized_p_l = models.DecimalField(max_digits=12, decimal_places=2)
    close_time = models.DateTimeField(default=timezone.now)
    close_reason = models.CharField(max_length=20)

    def __str__(self):
        return f"Closed: {self.position}"


s3_storage = S3Boto3Storage()


class ForexRobot(models.Model):
    ROBOT_MARKETS = [
        ('forex', 'Forex'),
        ('crypto', 'Crypto'),
        ('indices', 'Indices'),
        ('commodities', 'Commodities'),
    ]

    name = models.CharField(max_length=100, unique=True)
    image = models.ImageField(upload_to='robots/', storage=S3Boto3Storage(), blank=True, null=True)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discounted_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    best_markets = models.CharField(max_length=20, choices=ROBOT_MARKETS)
    win_rate_sashi = models.IntegerField(default=90, validators=[MinValueValidator(0), MaxValueValidator(100)])
    win_rate_normal = models.IntegerField(default=10, validators=[MinValueValidator(0), MaxValueValidator(100)])
    stake_per_trade = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('10.00'))
    profit_multiplier = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('1.00'))
    is_ea = models.BooleanField(default=False)
    max_open_positions = models.IntegerField(default=2, validators=[MinValueValidator(1), MaxValueValidator(10)])
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    @property
    def image_url(self):
        return self.image.url if self.image else None

    @property
    def effective_price(self):
        return self.discounted_price if self.discounted_price is not None else self.price


class UserRobot(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='robots')
    robot = models.ForeignKey(ForexRobot, on_delete=models.CASCADE)
    purchased_at = models.DateTimeField(auto_now_add=True)
    is_running = models.BooleanField(default=False)
    last_trade_time = models.DateTimeField(null=True, blank=True)
    stake_per_trade = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('10.00'))
    selected_pair = models.ForeignKey(ForexPair, null=True, blank=True, on_delete=models.SET_NULL)
    timeframe = models.CharField(max_length=3, choices=TIME_FRAMES, default='M1')
    is_ea = models.BooleanField(default=False)
    max_open_positions = models.IntegerField(default=2)
    target_profit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    class Meta:
        unique_together = ('user', 'robot')

    def __str__(self):
        return f"{self.user.username} - {self.robot.name}"

    def close_all_positions(self):
        if not self.is_ea:
            return 0

        open_positions = Position.objects.filter(ea_robot=self, status='open')
        closed_count = 0

        for position in open_positions.iterator():
            try:
                current_price = position.pair.get_current_price(
                    entry_time=position.entry_time,
                    is_sashi=position.user.is_sashi,
                    direction=position.direction,
                    time_frame=position.time_frame
                )
                position.close_position(current_price, is_auto=False, close_reason='ea_stopped')
                closed_count += 1
            except Exception as e:
                logger.error(f"Error closing position {position.id}: {e}")

        return closed_count


class BotLog(models.Model):
    user_robot = models.ForeignKey(UserRobot, on_delete=models.CASCADE, related_name='logs')
    message = models.TextField()
    trade_result = models.CharField(max_length=10, null=True, blank=True)
    profit_loss = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Log {self.id} - {self.user_robot}"