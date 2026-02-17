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
    if created and instance.status == 'pending_otp':
        otp = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        instance.otp_code = otp
        instance.otp_sent_at = timezone.now()
        instance.save(update_fields=['otp_code', 'otp_sent_at'])

        html_content = render_to_string('emails/withdrawal_otp.html', {
            'amount_usd': f"{instance.amount_usd:,}",
            'agent_name': instance.agent.name,
            'otp': otp
        })
        email = EmailMultiAlternatives(
            "Withdrawal OTP",
            f"Your OTP is {otp}. Valid for 10 minutes.",
            settings.DEFAULT_FROM_EMAIL,
            [instance.user.email]
        )
        email.attach_alternative(html_content, "text/html")
        email.send(fail_silently=False)

        logger.info(f"OTP sent for withdrawal {instance.id}")