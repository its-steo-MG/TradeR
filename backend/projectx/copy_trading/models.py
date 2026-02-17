# copy_trading/models.py
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from accounts.models import User, Account
from trading.models import Market, TradeType, Trade
from dashboard.models import Transaction
from django.db.models import Sum


class Trader(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='trader_profile')
    bio = models.TextField(blank=True, help_text="Short bio or trading strategy description")
    risk_level = models.CharField(
        max_length=10,
        choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')],
        default='medium'
    )
    min_allocation = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('100.00'),
        validators=[MinValueValidator(Decimal('100.00'))]
    )
    performance_fee_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('20.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('50.00'))]
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Trader: {self.user.username}"

    @property
    def win_rate(self):
        trades = Trade.objects.filter(user=self.user)
        if not trades.exists():
            return Decimal('0.00')
        wins = trades.filter(is_win=True).count()
        return (Decimal(wins) / Decimal(trades.count())) * Decimal('100.00')

    @property
    def average_return(self):
        trades = Trade.objects.filter(user=self.user)
        if not trades.exists():
            return Decimal('0.00')
        total_profit = trades.aggregate(total=Sum('profit'))['total'] or Decimal('0.00')
        return (total_profit / Decimal(trades.count()))  # Average profit per trade (can be negative)

    @property
    def subscriber_count(self):
        return self.copy_subscriptions.filter(is_active=True).count()


class CopySubscription(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='copy_subscriptions')
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='copy_subscriptions')
    trader = models.ForeignKey(Trader, on_delete=models.CASCADE, related_name='copy_subscriptions')
    allocated_amount = models.DecimalField(max_digits=12, decimal_places=2)
    max_drawdown_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('20.00'))
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'account', 'trader')

    def __str__(self):
        return f"{self.user.username} copies {self.trader.user.username} (${self.allocated_amount})"

    def clean(self):
        """Validate allocated amount against account balance and trader minimum"""
        from django.core.exceptions import ValidationError

        if self.allocated_amount < self.trader.min_allocation:
            raise ValidationError(f"Minimum allocation for this trader is ${self.trader.min_allocation}")

        balance = Decimal(str(self.account.balance))
        if self.allocated_amount > balance:
            raise ValidationError("Allocated amount exceeds available account balance")

    def save(self, *args, **kwargs):
        self.clean()  # Run validation
        super().save(*args, **kwargs)

    def check_drawdown(self):
        # Simple peak drawdown calculation
        pnl = self.current_pnl
        current_value = self.allocated_amount + pnl
        if not hasattr(self, '_peak_value'):
            self._peak_value = max(self.allocated_amount, current_value)
        if current_value > self._peak_value:
            self._peak_value = current_value
        drawdown = max(Decimal('0.00'), (self._peak_value - current_value) / self._peak_value * Decimal('100.00')) if self._peak_value > 0 else Decimal('0.00')
        return drawdown

    @property
    def current_pnl(self):
        return self.copied_trades.aggregate(total=Sum('profit'))['total'] or Decimal('0.00')


class TradeSignal(models.Model):
    trader = models.ForeignKey(Trader, on_delete=models.CASCADE, related_name='signals')
    market = models.ForeignKey(Market, on_delete=models.PROTECT)
    trade_type = models.ForeignKey(TradeType, on_delete=models.PROTECT)
    direction = models.CharField(max_length=10, choices=[('call', 'Call'), ('put', 'Put')])
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    entry_spot = models.DecimalField(max_digits=10, decimal_places=5, null=True, blank=True)
    is_closed = models.BooleanField(default=False)
    profit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Signal {self.id} by {self.trader.user.username}"


class CopiedTrade(models.Model):
    subscription = models.ForeignKey(CopySubscription, on_delete=models.CASCADE, related_name='copied_trades')
    signal = models.ForeignKey(TradeSignal, on_delete=models.CASCADE, related_name='copied_from')
    trade = models.OneToOneField(Trade, on_delete=models.SET_NULL, null=True, blank=True)
    scaled_amount = models.DecimalField(max_digits=12, decimal_places=2)
    profit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    fee_paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Copied Trade for {self.subscription.user.username} from signal {self.signal.id}"

    def calculate_fee(self):
        if self.profit and self.profit > 0:
            fee_percent = self.subscription.trader.performance_fee_percent / Decimal('100.00')
            fee_amount = self.profit * fee_percent

            # Deduct fee from recorded profit
            self.profit -= fee_amount
            self.fee_paid = fee_amount
            self.save(update_fields=['profit', 'fee_paid'])

            # Deduct fee from subscriber balance
            sub_account = self.subscription.account
            sub_account.balance -= fee_amount
            sub_account.save()

            # Create debit transaction for subscriber
            Transaction.objects.create(
                account=sub_account,
                amount=-fee_amount,
                transaction_type='debit',
                description=f"Performance fee for copied trade from {self.signal.trader.user.username}"
            )

            # Credit fee to trader's account
            trader_account = self.signal.trader.user.accounts.filter(
                account_type__in=['standard', 'pro-fx']
            ).first()
            if trader_account:
                trader_account.balance += fee_amount
                trader_account.save()
                Transaction.objects.create(
                    account=trader_account,
                    amount=fee_amount,
                    transaction_type='credit',
                    description=f"Performance fee from copied trade (Subscriber: {self.subscription.user.username})"
                )