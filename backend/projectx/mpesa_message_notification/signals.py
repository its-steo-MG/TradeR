# mpesa_message_notification/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
import pytz
import logging

logger = logging.getLogger('mpesa_message_notification')


def format_mpesa_date(dt):
    """Format date and time in East Africa Time (EAT - UTC+3)"""
    if dt is None:
        dt = timezone.now()
    
    local_tz = pytz.timezone('Africa/Nairobi')
    local_time = timezone.localtime(dt, local_tz)

    date_str = f"{local_time.day}/{local_time.month}/{local_time.strftime('%y')}"
    
    hour = local_time.strftime("%I").lstrip("0") or "12"
    time_str = f"{hour}:{local_time.strftime('%M')} {local_time.strftime('%p')}"
    
    return date_str, time_str


@receiver(post_save, sender='mpesa_simulator.MpesaTransaction')
def create_mpesa_notification(sender, instance, created, **kwargs):
    if not created:
        return

    try:
        from .models import MpesaNotification

        date_str, time_str = format_mpesa_date(instance.created_at)

        phone = instance.recipient_phone or "5515738"
        
        # Use class instead of hard-coded blue to match frontend
        phone_link = (
            f'<a href="tel:{phone}" '
            f'class="text-ios-blue underline">'
            f'{phone}</a>'
        )

        if instance.transaction_type == 'deposit':
            message = (
                f"{instance.mpesa_id} Confirmed.You have received Ksh{instance.amount:,.2f} from "
                f"{instance.recipient_name} {phone_link} on {date_str} at {time_str} "
                f"New M-PESA balance is Ksh{instance.mpesa_user.balance:,.2f}. "
                f"Download and try the Business App; Android https://bit.ly/lnm-app or "
                f"IOS https://bit.ly/LNM-app"
            )
            notif_type = 'received'

        elif instance.transaction_type == 'withdrawal':
            message = (
                f"{instance.mpesa_id} Confirmed.Ksh{instance.amount:,.2f} paid to "
                f"{instance.recipient_name} {phone_link} on {date_str} at {time_str}. "
                f"New M-PESA balance is Ksh{instance.mpesa_user.balance:,.2f}. "
                f"Transaction cost, Ksh0.00. Amount you can transact within the day is 499,730.00. "
                f"Download My OneApp on https://saf.cx/lPKcC"
            )
            notif_type = 'sent'

        else:
            message = f"{instance.mpesa_id} {instance.transaction_type.capitalize()} of Ksh{instance.amount:,.2f} completed."
            notif_type = 'sent'

        if not MpesaNotification.objects.filter(mpesa_transaction=instance).exists():
            MpesaNotification.objects.create(
                mpesa_user=instance.mpesa_user,
                mpesa_transaction=instance,
                notification_type=notif_type,
                message=message,
            )
            logger.info(f"✅ Notification created for {instance.mpesa_id}")

    except Exception as e:
        logger.error(f"Failed to create notification: {e}", exc_info=True)