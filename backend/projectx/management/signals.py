# management/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
import logging

from .models import ManagementRequest

logger = logging.getLogger(__name__)


# ====================== PAYMENT VERIFIED EMAIL ======================
@receiver(post_save, sender=ManagementRequest)
def notify_user_on_payment_verified(sender, instance, created, **kwargs):
    """Send email when payment is verified"""
    if created or instance.status != 'payment_verified' or not instance.mpesa_receipt_number:
        return

    # Prevent duplicate emails
    if getattr(instance, '_payment_email_sent', False):
        return

    try:
        subject = "Payment Verified – Submit Your Account Credentials ✅"

        message = f"""Hi {instance.user.username},

We're happy to confirm that your payment has been successfully received and verified!

Management ID: {instance.management_id}
Amount Paid: ${instance.payment_amount}
M-Pesa Receipt: {instance.mpesa_receipt_number}
Date: {instance.payment_date.strftime('%d %b %Y, %H:%M') if instance.payment_date else 'N/A'}

Next Step: Please submit your trading account login credentials...

Thank you for trusting TradeRiser!

Best regards,
TradeRiser Team
{settings.FRONTEND_URL}
"""

        html_message = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }}
                .header {{ color: #0066cc; font-size: 24px; margin-bottom: 20px; }}
                .highlight {{ background-color: #f8f9fa; padding: 20px; border-left: 5px solid #0066cc; border-radius: 4px; margin: 20px 0; }}
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
                <p>Please submit your trading account login credentials so we can begin managing your account.</p>
                <p>Once submitted, our team will start trading toward your <strong>${instance.target_profit}</strong> target.</p>

                <p>Thank you for trusting <strong>TradeRiser</strong>!</p>
                <p>Best regards,<br><strong>TradeRiser Team</strong></p>
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
            fail_silently=True,
        )

        instance._payment_email_sent = True
        logger.info(f"✅ Payment verified email sent for {instance.management_id}")

    except Exception as e:
        logger.error(f"Failed to send payment verified email for {instance.management_id}: {e}", exc_info=True)


# ====================== MANAGEMENT STARTED EMAIL ======================
@receiver(post_save, sender=ManagementRequest)
def send_management_started_email(sender, instance, created, **kwargs):
    """
    Sends the 'Account Management Started' email **ONLY ONCE** 
    when status changes to 'active'.
    """
    if created:
        return

    if instance.status != 'active':
        return

    if instance.started_email_sent:
        return  # ← This prevents sending the email again and again

    try:
        daily_target_str = f"${instance.daily_target_profit:,.2f}" if instance.daily_target_profit else "N/A"
        start_date_str = instance.start_date.strftime('%d %b %Y') if instance.start_date else "N/A"
        end_date_str = instance.end_date.strftime('%d %b %Y') if instance.end_date else "TBD"

        subject = "Your TradeRiser Account Management Has Started! 🚀"

        message = f"""Dear {instance.user.username},

Great news — your account management has officially begun! 🚀

Management ID:          {instance.management_id}
Account Type:           {instance.get_account_type_display()}
Stake Amount:           ${instance.stake:,.2f}
Target Profit:          ${instance.target_profit:,.2f}
Duration:               {instance.days} days
Start Date:             {start_date_str}
Expected Completion:    {end_date_str}
Daily Target Profit:    {daily_target_str}

Our professional team is now actively trading on your behalf.

You will receive daily progress updates via email.

Let's make those profits together!

Best regards,
TradeRiser Trading Team
{settings.FRONTEND_URL}
"""

        html_message = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 30px; background-color: #ffffff; }}
                .header {{ color: #0066cc; font-size: 26px; margin-bottom: 10px; }}
                .highlight {{ 
                    background-color: #f8f9fa; 
                    padding: 25px; 
                    border-left: 6px solid #0066cc; 
                    border-radius: 6px;
                    margin: 25px 0;
                }}
                table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
                td {{ padding: 10px 0; border-bottom: 1px solid #eee; }}
                .label {{ font-weight: bold; color: #555; width: 200px; vertical-align: top; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h2 class="header">Account Management Started! 🚀</h2>
                
                <p>Dear <strong>{instance.user.username}</strong>,</p>
                <p>Great news — your account management has officially begun!</p>
                
                <div class="highlight">
                    <table>
                        <tr><td class="label">Management ID</td><td><strong>{instance.management_id}</strong></td></tr>
                        <tr><td class="label">Account Type</td><td>{instance.get_account_type_display()}</td></tr>
                        <tr><td class="label">Stake Amount</td><td>${instance.stake:,.2f}</td></tr>
                        <tr><td class="label">Target Profit</td><td><strong>${instance.target_profit:,.2f}</strong></td></tr>
                        <tr><td class="label">Duration</td><td>{instance.days} days</td></tr>
                        <tr><td class="label">Start Date</td><td>{start_date_str}</td></tr>
                        <tr><td class="label">Expected Completion</td><td>{end_date_str}</td></tr>
                        <tr><td class="label">Daily Target Profit</td><td>{daily_target_str}</td></tr>
                    </table>
                </div>

                <p>Our professional team is now actively trading on your behalf to reach your target.</p>
                <p>You will receive daily progress updates (or major milestones) via email.</p>

                <p>Thank you for choosing <strong>TradeRiser</strong> — let's make those profits together!</p>

                <p>Best regards,<br><strong>TradeRiser Trading Team</strong></p>
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
            fail_silently=True,
        )

        # Mark as sent so it never fires again
        instance.started_email_sent = True
        instance.save(update_fields=['started_email_sent'])

        logger.info(f"✅ Management started email sent successfully for {instance.management_id}")

    except Exception as e:
        logger.error(f"Failed to send management started email for {instance.management_id}: {str(e)}", exc_info=True)