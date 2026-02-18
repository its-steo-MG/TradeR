# wallet/models.py
import uuid
import random
from decimal import Decimal
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from accounts.models import Account

User = get_user_model()

def generate_reference_id():
    return f"WT-{uuid.uuid4().hex[:12].upper()}"

def generate_otp():
    return ''.join([str(random.randint(0, 9)) for _ in range(6)])

# --------------------------------------------------------------
# 1. Currency
# --------------------------------------------------------------
class Currency(models.Model):
    code = models.CharField(max_length=3, unique=True)
    name = models.CharField(max_length=50)
    symbol = models.CharField(max_length=5, default='$')
    is_fiat = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Currencies"

    def __str__(self):
        return self.code


# --------------------------------------------------------------
# 2. ExchangeRate
# --------------------------------------------------------------
class ExchangeRate(models.Model):
    base_currency = models.ForeignKey(
        Currency, on_delete=models.PROTECT, related_name='base_rates'
    )
    target_currency = models.ForeignKey(
        Currency, on_delete=models.PROTECT, related_name='target_rates'
    )
    live_rate = models.DecimalField(max_digits=12, decimal_places=6)
    admin_withdrawal_rate = models.DecimalField(max_digits=12, decimal_places=6)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('base_currency', 'target_currency')
        verbose_name_plural = "Exchange Rates"

    def __str__(self):
        return f"{self.base_currency} to {self.target_currency}: {self.live_rate}"


# --------------------------------------------------------------
# 3. MpesaNumber
# --------------------------------------------------------------
class MpesaNumber(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='mpesa_number'
    )
    phone_number = models.CharField(max_length=15)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.phone_number}"


# --------------------------------------------------------------
# 4. Wallet
# --------------------------------------------------------------
class Wallet(models.Model):
    WALLET_TYPES = [
        ('main', 'Main'),
        ('trading', 'Trading'),
    ]

    account = models.ForeignKey(
        Account, on_delete=models.CASCADE, related_name='wallets'
    )
    wallet_type = models.CharField(max_length=10, choices=WALLET_TYPES)
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT)
    balance = models.DecimalField(max_digits=18, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('account', 'wallet_type', 'currency')

    def __str__(self):
        return f"{self.account.user.username} - {self.wallet_type} {self.currency}"


# --------------------------------------------------------------
# 5. OTPCode
# --------------------------------------------------------------
class OTPCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    code = models.CharField(max_length=6, default=generate_otp)
    purpose = models.CharField(max_length=20)
    transaction = models.OneToOneField(
        'WalletTransaction', on_delete=models.CASCADE, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)  # Explicit expiration time
    is_used = models.BooleanField(default=False)

    def is_expired(self):
        if self.expires_at:
            return timezone.now() > self.expires_at
        # Fallback to 5 minutes if expires_at not set
        return timezone.now() > self.created_at + timezone.timedelta(minutes=5)

    def __str__(self):
        return f"{self.user.username} - {self.code} ({self.purpose})"


# --------------------------------------------------------------
# 6. WalletTransaction
# --------------------------------------------------------------
class WalletTransaction(models.Model):
    TRANSACTION_TYPES = [
        ('deposit', 'Deposit'),
        ('withdrawal', 'Withdrawal'),
        ('transfer_out', 'Transfer Out'),
        ('transfer_in', 'Transfer In'),
    ]

    wallet = models.ForeignKey(
        Wallet, on_delete=models.CASCADE, related_name='transactions'
    )
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.ForeignKey(
        Currency, on_delete=models.PROTECT, related_name='transactions_as_source'
    )
    target_currency = models.ForeignKey(
        Currency, on_delete=models.PROTECT, related_name='transactions_as_target',
        null=True, blank=True
    )
    converted_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    exchange_rate_used = models.DecimalField(max_digits=12, decimal_places=6, null=True, blank=True)

    status = models.CharField(
        max_length=10,
        choices=[('pending', 'Pending'), ('completed', 'Completed'), ('failed', 'Failed')],
        default='pending'
    )
    reference_id = models.CharField(
        max_length=50,
        default=generate_reference_id
        # unique=True REMOVED → allows transfer_in/out to share same reference_id
    )
    description = models.TextField(blank=True)
    mpesa_phone = models.CharField(max_length=15, blank=True, null=True)
    checkout_request_id = models.CharField(max_length=40, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Wallet Transaction"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_transaction_type_display()} - {self.amount} {self.currency}"