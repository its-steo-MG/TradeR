from decimal import Decimal
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.utils import timezone
import uuid

User = get_user_model()


class EquityAccount(models.Model):
    ACCOUNT_TYPES = [
        ('savings', 'Savings Account'),
        ('current', 'Current Account'),
        ('business', 'Business Account'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='equity_accounts')
    account_name = models.CharField(max_length=120)          # e.g. "Sospeter Chaka Sa" / "Shee"
    account_number = models.CharField(max_length=20, unique=True)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES, default='savings')
    balance = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    currency = models.CharField(max_length=3, default='KES')
    is_primary = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    loan_limit = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_primary', '-created_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['account_number']),
        ]

    def __str__(self):
        return f"{self.account_name} ({self.account_number}) – {self.balance} {self.currency}"

    def save(self, *args, **kwargs):
        if not self.account_number:
            # Generate realistic looking Equity-style account number
            self.account_number = f"09{str(uuid.uuid4().int)[:10]}"
        super().save(*args, **kwargs)


class EquityTransaction(models.Model):
    TRANSACTION_TYPES = [
        ('credit', 'Credit'),
        ('debit', 'Debit'),
        ('transfer_in', 'Transfer In'),
        ('transfer_out', 'Transfer Out'),
        ('airtime', 'Buy Airtime'),
        ('withdrawal_credit', 'Marketer Withdrawal Credit'),  # special
        ('admin_adjustment', 'Admin Balance Adjustment'),
        ('loan', 'Loan Disbursement'),
        ('repayment', 'Loan Repayment'),
    ]

    account = models.ForeignKey(EquityAccount, on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    transaction_type = models.CharField(max_length=30, choices=TRANSACTION_TYPES)
    description = models.CharField(max_length=255)
    reference = models.CharField(max_length=50, unique=True, blank=True)
    balance_after = models.DecimalField(max_digits=14, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    # Optional link to your existing AgentWithdrawal
    related_agent_withdrawal = models.ForeignKey(
        'agents.AgentWithdrawal',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='equity_credits'
    )

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = f"EQ{timezone.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.transaction_type} {self.amount} – {self.description}"


class EquityNotification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='equity_notifications')
    title = models.CharField(max_length=120)
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    data = models.JSONField(default=dict, blank=True)   # extra payload for frontend
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} → {self.user}"