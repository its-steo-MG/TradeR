# agents/signals.py
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import AgentWithdrawal
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string
import random
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=AgentWithdrawal)
def send_withdrawal_otp(sender, instance, created, **kwargs):
    """
    Send OTP email when a new withdrawal is created with status 'pending_otp'
    Now properly configured for Resend via django-anymail
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

        # Create and send email using Resend (via django-anymail)
        email = EmailMultiAlternatives(
            subject="Your TradeRiser Withdrawal OTP",
            body=f"Your OTP for withdrawing ${instance.amount_usd:,.2f} is {otp}. Valid for 10 minutes.",
            from_email=settings.DEFAULT_FROM_EMAIL,      # Uses noreply@mail.traderiserapp.com
            to=[instance.user.email]
        )

        # Attach HTML version
        email.attach_alternative(html_content, "text/html")
        email.send(fail_silently=False)

        logger.info(f"Withdrawal OTP sent successfully for withdrawal ID {instance.id} to {instance.user.email}")