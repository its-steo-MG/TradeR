# agents/models.py
import uuid
from decimal import Decimal
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, EmailValidator, MaxLengthValidator
from accounts.models import Account
import logging
from storages.backends.s3boto3 import S3Boto3Storage

logger = logging.getLogger(__name__)

User = get_user_model()


def agent_profile_upload_to(instance, filename):
    """Upload agent profile pictures to agents/<id>/filename"""
    return f"agents/{instance.id}/{filename}"


def payment_screenshot_upload_to(instance, filename):
    """Upload deposit proof screenshots"""
    return f"agents/screenshots/{instance.id}/{filename}"


class Agent(models.Model):
    METHOD_CHOICES = [
        ('mpesa', 'M-Pesa'),
        ('paypal', 'PayPal'),
        ('bank_transfer', 'Bank Transfer'),
    ]

    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)

    # RESTORED: profile_picture (matches your working version)
    profile_picture = models.ImageField(
        upload_to=agent_profile_upload_to,
        storage=S3Boto3Storage(),
        null=True,
        blank=True
    )

    method = models.CharField(max_length=20, choices=METHOD_CHOICES, db_index=True)
    is_active = models.BooleanField(default=True)
    location = models.CharField(max_length=100, blank=True, default="Kenya")
    rating = models.FloatField(default=0.0)
    reviews = models.IntegerField(default=0)
    min_amount = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True,
        help_text="Minimum deposit in KES"
    )
    max_amount = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True,
        help_text="Maximum deposit in KES"
    )
    response_time = models.CharField(max_length=50, blank=True, default="Within 5 minutes")
    verified = models.BooleanField(default=False)

    # Method-specific fields
    mpesa_phone = models.CharField(max_length=30, blank=True, null=True)
    paypal_email = models.EmailField(blank=True, null=True)
    paypal_link = models.URLField(blank=True, null=True)
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    bank_account_name = models.CharField(max_length=100, blank=True, null=True)
    bank_account_number = models.CharField(max_length=50, blank=True, null=True)
    bank_swift = models.CharField(max_length=11, blank=True, null=True)

    deposit_rate_kes_to_usd = models.DecimalField(
        max_digits=10, decimal_places=2, default=130.0,
        validators=[MinValueValidator(Decimal('1.00'))]
    )
    withdrawal_rate_usd_to_kes = models.DecimalField(
        max_digits=10, decimal_places=2, default=129.5,
        validators=[MinValueValidator(Decimal('1.00'))]
    )

    instructions = models.TextField(blank=True)

    class Meta:
        ordering = ['-id']

    def __str__(self):
        return self.name


class AgentDeposit(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='agent_deposits')
    account = models.ForeignKey(
        Account, on_delete=models.PROTECT,
        limit_choices_to={'account_type__in': ['standard', 'pro-fx']}
    )
    agent = models.ForeignKey(Agent, on_delete=models.PROTECT)
    amount_kes = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(100)])
    amount_usd = models.DecimalField(max_digits=14, decimal_places=2, editable=False)
    payment_method = models.CharField(max_length=30, choices=Agent.METHOD_CHOICES, editable=False, db_index=True)

    transaction_code = models.CharField(max_length=50, blank=True, null=True, validators=[MaxLengthValidator(50)])
    paypal_transaction_id = models.CharField(max_length=50, blank=True, null=True, validators=[MaxLengthValidator(50)])
    bank_reference = models.CharField(max_length=100, blank=True, null=True, validators=[MaxLengthValidator(100)])

    screenshot = models.ImageField(
        upload_to=payment_screenshot_upload_to,
        storage=S3Boto3Storage(),
        blank=True,
        null=True
    )

    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, blank=True, null=True,
        related_name='verified_deposits'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['payment_method']),
            models.Index(fields=['status'])
        ]

    def save(self, *args, **kwargs):
        if not self.pk:
            self.payment_method = self.agent.method
        if not self.amount_usd:
            self.amount_usd = self.amount_kes / self.agent.deposit_rate_kes_to_usd
            self.amount_usd = self.amount_usd.quantize(Decimal('0.01'))
        super().save(*args, **kwargs)
        logger.info(f"Deposit {self.id} saved for user {self.user.username}")

    def __str__(self):
        return f"{self.user} → {self.agent} ({self.amount_usd} USD)"


class AgentWithdrawal(models.Model):
    STATUS_CHOICES = [
        ('pending_otp', 'Pending OTP'),
        ('otp_verified', 'OTP Verified'),
        ('completed', 'Completed'),
        ('rejected', 'Rejected'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='agent_withdrawals')
    account = models.ForeignKey(
        Account, on_delete=models.PROTECT,
        limit_choices_to={'account_type__in': ['standard', 'pro-fx']}
    )
    agent = models.ForeignKey(Agent, on_delete=models.PROTECT)

    amount_usd = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(10)])
    amount_kes = models.DecimalField(max_digits=14, decimal_places=2, editable=False)
    payment_method = models.CharField(max_length=30, choices=Agent.METHOD_CHOICES, editable=False, db_index=True)

    # User-provided withdrawal details
    user_paypal_email = models.EmailField(blank=True, null=True, validators=[EmailValidator()])
    user_bank_name = models.CharField(max_length=100, blank=True, null=True)
    user_bank_account_name = models.CharField(max_length=100, blank=True, null=True)
    user_bank_account_number = models.CharField(max_length=50, blank=True, null=True)
    user_bank_swift = models.CharField(max_length=11, blank=True, null=True)

    otp_code = models.CharField(max_length=6, blank=True)
    otp_sent_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending_otp')
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['payment_method']),
            models.Index(fields=['status'])
        ]

    def save(self, *args, **kwargs):
        if not self.pk:
            self.payment_method = self.agent.method
        if not self.amount_kes:
            self.amount_kes = self.amount_usd * self.agent.withdrawal_rate_usd_to_kes
            self.amount_kes = self.amount_kes.quantize(Decimal('0.01'))
        super().save(*args, **kwargs)
        logger.info(f"Withdrawal {self.id} saved for user {self.user.username}")

    def is_otp_expired(self):
        if not self.otp_sent_at:
            return True
        return timezone.now() > self.otp_sent_at + timezone.timedelta(minutes=10)

    def __str__(self):
        return f"{self.user} ← {self.agent} ({self.amount_usd} USD)"