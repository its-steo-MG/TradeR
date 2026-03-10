# management/signals.py
from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
import logging

from .models import ManagementRequest

logger = logging.getLogger(__name__)

@receiver(pre_save, sender=ManagementRequest)
def send_management_started_email(sender, instance, **kwargs):
    """
    Send email to user exactly when status changes to 'active'
    """
    if not instance.pk:
        return  # new object → skip

    try:
        old_instance = sender.objects.get(pk=instance.pk)
        if old_instance.status != 'active' and instance.status == 'active':
            send_mail(
                subject="Your TradeRiser Account Management Has Started! 🚀",
                message=(
                    f"Dear {instance.user.username},\n\n"
                    f"Great news — your account management has officially begun!\n\n"
                    f"Management ID:          {instance.management_id}\n"
                    f"Account Type:           {instance.get_account_type_display()}\n"
                    f"Stake Amount:           ${instance.stake:,.2f}\n"
                    f"Target Profit:          ${instance.target_profit:,.2f}\n"
                    f"Duration:               {instance.days} days\n"
                    f"Start Date:             {instance.start_date.strftime('%d %b %Y')}\n"
                    f"Expected Completion:    {instance.end_date.strftime('%d %b %Y') if instance.end_date else 'TBD'}\n"
                    f"Daily Target Profit:    ${instance.daily_target_profit:,.2f if instance.daily_target_profit else 'N/A'}\n\n"
                    f"Our professional team is now actively trading on your behalf to reach your target.\n"
                    f"You will receive daily progress updates (or major milestones) via email.\n\n"
                    f"Thank you for choosing TradeRiser — let's make those profits together!\n\n"
                    f"Best regards,\n"
                    f"TradeRiser Trading Team\n"
                    f"{settings.FRONTEND_URL}\n"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[instance.user.email],
                fail_silently=False,   # important → raises if fails
            )
            logger.info(f"Management started email sent to {instance.user.email} for {instance.management_id}")
    except sender.DoesNotExist:
        pass
    except Exception as e:
        logger.error(f"Failed to send management started email for {instance.management_id}: {str(e)}")