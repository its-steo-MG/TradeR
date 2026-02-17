# management/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from decimal import Decimal
import uuid
import logging

User = get_user_model()

logger = logging.getLogger(__name__)

def generate_management_id():
    return f"MGMT-{uuid.uuid4().hex[:8].upper()}"

class ManagementRequest(models.Model):
    STATUS_CHOICES = [
        ('pending_payment', 'Pending Payment'),
        ('payment_verified', 'Payment Verified'),
        ('credentials_pending', 'Awaiting Credentials'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    ACCOUNT_TYPES = [
        ('standard', 'Standard'),
        ('pro-fx', 'ProFX'),
        # Add other types if needed
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='management_requests')
    management_id = models.CharField(max_length=20, unique=True, default=generate_management_id)

    stake = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(50)])
    target_profit = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(10)])
    payment_amount = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    mpesa_phone = models.CharField(max_length=15)

    # New field for account type
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES, default='standard')

    # M-Pesa payment fields (replaces WalletTransaction)
    merchant_request_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    checkout_request_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    mpesa_receipt_number = models.CharField(max_length=50, blank=True, null=True)
    payment_date = models.DateTimeField(null=True, blank=True)

    account_email = models.EmailField(blank=True, null=True)
    account_password = models.CharField(max_length=255, blank=True, null=True)  # Consider encryption later

    days = models.PositiveIntegerField(null=True, blank=True)
    daily_stake = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    daily_target_profit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    current_pnl = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_payment')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # Auto-calculate payment amount (20% of target profit)
        if self.target_profit and not self.payment_amount:
            self.payment_amount = self.target_profit * Decimal('0.20')

        # Auto-calculate daily target if days are set
        if self.days and self.target_profit and not self.daily_target_profit:
            self.daily_target_profit = self.target_profit / Decimal(self.days)

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.management_id} | {self.user.username} | Target ${self.target_profit}"
    
@receiver(post_save, sender=ManagementRequest)
def notify_user_on_payment_verified(sender, instance, created, **kwargs):
    """
    Sends email to user when payment is verified (status becomes 'payment_verified')
    Only triggers if mpesa_receipt_number exists (real payment) and not on creation.
    """
    if not created and instance.status == 'payment_verified' and instance.mpesa_receipt_number:
        try:
            send_mail(
                "Payment Verified – Submit Your Account Credentials ✅",
                f"Hi {instance.user.username},\n\n"
                f"We're happy to confirm that your payment has been successfully received and verified!\n\n"
                f"Management ID: {instance.management_id}\n"
                f"Amount Paid: ${instance.payment_amount}\n"
                f"M-Pesa Receipt: {instance.mpesa_receipt_number}\n"
                f"Date: {instance.payment_date}\n\n"
                f"Next Step:\n"
                f"Please submit your trading account login credentials (email and password) so we can begin managing your account.\n"
                f"You can do this in the app under the Management section.\n\n"
                f"Once submitted, our team will start trading toward your ${instance.target_profit} target.\n\n"
                f"Thank you for trusting TradeRiser!\n\n"
                f"Best regards,\nTradeRiser Team",
                settings.DEFAULT_FROM_EMAIL,
                [instance.user.email],
                fail_silently=False,
            )
            logger.info(f"Payment verified email sent to user: {instance.management_id}")
        except Exception as e:
            logger.error(f"Failed to send payment verified email to {instance.user.email}: {e}")