# agents/signals.py
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from .models import AgentWithdrawal
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string
import random
import threading
import logging

logger = logging.getLogger(__name__)


# ============================================================
# 1. SEND OTP WHEN WITHDRAWAL IS CREATED
# ============================================================
@receiver(post_save, sender=AgentWithdrawal)
def send_withdrawal_otp(sender, instance, created, **kwargs):
    """
    Send OTP email when a new withdrawal is created with status 'pending_otp'
    """
    if created and instance.status == 'pending_otp':
        # Generate 6-digit OTP
        otp = ''.join([str(random.randint(0, 9)) for _ in range(6)])

        # Save OTP and timestamp
        instance.otp_code = otp
        instance.otp_sent_at = timezone.now()
        instance.save(update_fields=['otp_code', 'otp_sent_at'])

        # Render HTML template
        html_content = render_to_string('emails/withdrawal_otp.html', {
            'amount_usd': f"{instance.amount_usd:,.2f}",
            'agent_name': instance.agent.name,
            'otp': otp,
            'user_name': instance.user.get_full_name() or instance.user.username,
        })

        # Create and send email
        email = EmailMultiAlternatives(
            subject="Your TradeRiser Withdrawal OTP",
            body=f"Your OTP for withdrawing ${instance.amount_usd:,.2f} is {otp}. Valid for 10 minutes.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[instance.user.email]
        )
        email.attach_alternative(html_content, "text/html")
        email.send(fail_silently=False)

        logger.info(f"Withdrawal OTP sent successfully for withdrawal ID {instance.id} to {instance.user.email}")


# ============================================================
# 2. AUTO-COMPLETE MARKETER WITHDRAWALS AFTER 60 SECONDS
# ============================================================
def auto_complete_marketer_withdrawal(withdrawal_id):
    """
    Runs after 60 seconds.
    Marks the withdrawal as completed if the user is a marketer.
    """
    try:
        with transaction.atomic():
            withdrawal = AgentWithdrawal.objects.select_for_update().get(id=withdrawal_id)

            # Safety checks
            if withdrawal.status != 'otp_verified':
                return

            if not getattr(withdrawal.user, 'is_marketo', False):
                return

            withdrawal.status = 'completed'
            withdrawal.completed_at = timezone.now()
            withdrawal.save(update_fields=['status', 'completed_at'])

            logger.info(f"✅ Auto-completed marketer withdrawal #{withdrawal_id}")

    except Exception as e:
        logger.error(f"Auto-complete failed for withdrawal {withdrawal_id}: {e}")


@receiver(post_save, sender=AgentWithdrawal)
def schedule_auto_complete_for_marketer(sender, instance, **kwargs):
    """
    When a withdrawal becomes 'otp_verified' and the user is a marketer,
    schedule it to be completed after 60 seconds.
    """
    if instance.status != 'otp_verified':
        return

    if not getattr(instance.user, 'is_marketo', False):
        return

    # Schedule auto-complete in 60 seconds
    timer = threading.Timer(60.0, auto_complete_marketer_withdrawal, args=[instance.id])
    timer.daemon = True
    timer.start()

    logger.info(f"⏳ Scheduled auto-complete for marketer withdrawal #{instance.id} in 60 seconds")