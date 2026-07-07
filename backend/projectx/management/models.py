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
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='management_requests')
    management_id = models.CharField(max_length=20, unique=True, default=generate_management_id)

    stake = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(50)])
    target_profit = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(10)])
    payment_amount = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    mpesa_phone = models.CharField(max_length=15)

    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES, default='standard')

    # M-Pesa payment fields
    merchant_request_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    checkout_request_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    mpesa_receipt_number = models.CharField(max_length=50, blank=True, null=True)
    payment_date = models.DateTimeField(null=True, blank=True)

    account_email = models.EmailField(blank=True, null=True)
    account_password = models.CharField(max_length=255, blank=True, null=True)

    days = models.PositiveIntegerField(null=True, blank=True)
    daily_stake = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    daily_target_profit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    current_pnl = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_payment')

    # ←←← NEW FIELD: Prevents sending "Started" email multiple times
    started_email_sent = models.BooleanField(default=False)

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
    Sends a beautiful email to the user when payment is verified.
    Optimized for Resend (Anymail) with HTML + plain text fallback.
    """
    if created or instance.status != 'payment_verified' or not instance.mpesa_receipt_number:
        return

    try:
        subject = "Payment Verified – Submit Your Account Credentials ✅"

        # Plain text version (fallback)
        message = f"""Hi {instance.user.username},

We're happy to confirm that your payment has been successfully received and verified!

Management ID: {instance.management_id}
Amount Paid: ${instance.payment_amount}
M-Pesa Receipt: {instance.mpesa_receipt_number}
Date: {instance.payment_date.strftime('%d %b %Y, %H:%M') if instance.payment_date else 'N/A'}

Next Step:
Please submit your trading account login credentials (email and password) so we can begin managing your account.
You can do this in the app under the Management section.

Once submitted, our team will start trading toward your ${instance.target_profit} target.

Thank you for trusting TradeRiser!

Best regards,
TradeRiser Team
{settings.FRONTEND_URL}
"""

        # HTML version - Professional & Clean (Best with Resend)
        html_message = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }}
                .header {{ color: #0066cc; font-size: 24px; margin-bottom: 20px; }}
                .highlight {{ 
                    background-color: #f8f9fa; 
                    padding: 20px; 
                    border-left: 5px solid #0066cc; 
                    border-radius: 4px;
                    margin: 20px 0;
                }}
                .button {{ 
                    display: inline-block; 
                    padding: 12px 25px; 
                    background-color: #0066cc; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    margin: 15px 0;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h2 class="header">Payment Verified Successfully ✅</h2>
                
                <p>Hi <strong>{instance.user.username}</strong>,</p>
                
                <p>We're happy to confirm that your payment has been successfully received and verified!</p>
                
                <div class="highlight">
                    <strong>Management ID:</strong> {instance.management_id}<br>
                    <strong>Amount Paid:</strong> ${instance.payment_amount}<br>
                    <strong>M-Pesa Receipt:</strong> {instance.mpesa_receipt_number}<br>
                    <strong>Date:</strong> {instance.payment_date.strftime('%d %b %Y, %H:%M') if instance.payment_date else 'N/A'}
                </div>

                <h3>Next Step</h3>
                <p>Please submit your <strong>trading account login credentials</strong> (email and password) so we can begin managing your account.</p>
                <p>You can do this easily in the app under the <strong>Management</strong> section.</p>

                <p>Once submitted, our professional team will start trading toward your <strong>${instance.target_profit}</strong> target.</p>

                <p>Thank you for trusting <strong>TradeRiser</strong>!</p>

                <p>Best regards,<br>
                <strong>TradeRiser Team</strong></p>
            </div>
        </body>
        </html>
        """

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[instance.user.email],
            html_message=html_message,
            fail_silently=True,          # Important: Don't crash signal if email fails
        )
        logger.info(f"✅ Payment verified email sent to {instance.user.email} for {instance.management_id}")

    except Exception as e:
        logger.error(f"Failed to send payment verified email for {instance.management_id}: {e}")