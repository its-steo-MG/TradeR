from decimal import Decimal
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.utils import timezone
import uuid
import logging
import random

logger = logging.getLogger(__name__)
User = get_user_model()


def generate_binance_address():
    return f"0x{uuid.uuid4().hex[:40]}"


def generate_uid():
    return str(random.randint(100000000, 999999999))


class BinanceWallet(models.Model):
    NETWORK_CHOICES = [
        ('BEP20', 'BEP20 (BSC)'),
        ('TRC20', 'TRC20'),
        ('ERC20', 'ERC20'),
    ]
    VERIFICATION_CHOICES = [
        ('unverified', 'Unverified'),
        ('verified', 'Verified'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='binance_wallets')
    label = models.CharField(max_length=120, default="Main Wallet")
    address = models.CharField(max_length=100, unique=True, blank=True)
    uid = models.CharField(max_length=12, unique=True, blank=True, null=True)
    network = models.CharField(max_length=10, choices=NETWORK_CHOICES, default='BEP20')
    balance = models.DecimalField(
        max_digits=18, decimal_places=6, default=Decimal('0.000000'),
        validators=[MinValueValidator(Decimal('0.000000'))]
    )
    currency = models.CharField(max_length=10, default='USDT')
    is_primary = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    verification_status = models.CharField(
        max_length=20, choices=VERIFICATION_CHOICES, default='unverified'
    )
    account_tier = models.CharField(max_length=20, default='Regular')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_primary', '-created_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['address']),
            models.Index(fields=['uid']),
        ]

    def __str__(self):
        return f"{self.label} ({self.address[:8]}...{self.address[-6:]}) – {self.balance} {self.currency}"

    def save(self, *args, **kwargs):
        if not self.address:
            self.address = generate_binance_address()
        if not self.uid:
            self.uid = generate_uid()
        super().save(*args, **kwargs)


class BinanceTransaction(models.Model):
    TRANSACTION_TYPES = [
        ('credit', 'Credit'),
        ('debit', 'Debit'),
        ('deposit', 'Deposit'),
        ('withdrawal', 'Withdrawal'),
        ('admin_adjustment', 'Admin Balance Adjustment'),
        ('withdrawal_credit', 'Agent Withdrawal Credit'),
    ]

    wallet = models.ForeignKey(BinanceWallet, on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField(max_digits=18, decimal_places=6)
    transaction_type = models.CharField(max_length=30, choices=TRANSACTION_TYPES)
    description = models.CharField(max_length=255)
    reference = models.CharField(max_length=60, unique=True, blank=True)
    balance_after = models.DecimalField(max_digits=18, decimal_places=6)
    created_at = models.DateTimeField(auto_now_add=True)

    related_agent_withdrawal = models.ForeignKey(
        'agents.AgentWithdrawal',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='binance_credits'
    )

    related_agent_deposit = models.ForeignKey(
        'agents.AgentDeposit',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='binance_deposits'
    )

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = f"BN{timezone.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.transaction_type} {self.amount} {self.wallet.currency} – {self.description}"


class BinancePushSubscription(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="binance_push_subscriptions")
    endpoint = models.URLField(max_length=2048, unique=True)
    p256dh = models.CharField(max_length=200)
    auth = models.CharField(max_length=100)
    updated_at = models.DateTimeField(auto_now=True)


class BinanceNotification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='binance_notifications')
    title = models.CharField(max_length=120)
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    push_sent_at = models.DateTimeField(null=True, blank=True)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} → {self.user}"
