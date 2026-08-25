# mpesa_message_notification/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from django.db import transaction
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from decimal import Decimal
import pytz
import logging

logger = logging.getLogger('mpesa_message_notification')


def format_mpesa_date(dt):
    if dt is None:
        dt = timezone.now()
    
    local_tz = pytz.timezone('Africa/Nairobi')
    local_time = timezone.localtime(dt, local_tz)

    date_str = f"{local_time.day}/{local_time.month}/{local_time.strftime('%y')}"
    hour = local_time.strftime("%I").lstrip("0") or "12"
    time_str = f"{hour}:{local_time.strftime('%M')} {local_time.strftime('%p')}"
    
    return date_str, time_str


def mask_account(account_number: str) -> str:
    if not account_number:
        return "0***0000"
    account_number = str(account_number).strip()
    if len(account_number) <= 4:
        return f"0***{account_number}"
    return f"0***{account_number[-4:]}"


def format_equity_message(amount, sender_name, sender_account, receiver_account, reference, when=None):
    if when is None:
        when = timezone.localtime()

    amount_str = f"{amount:,.2f}"
    masked_sender = mask_account(sender_account)
    masked_receiver = mask_account(receiver_account)

    date_str = when.strftime("%d %b %Y")
    time_str = when.strftime("%H:%M")

    return (
        f"You have received {amount_str} KES from {sender_name.upper()} "
        f"{masked_sender} to your Equity account {masked_receiver}. "
        f"Ref. {reference} on {date_str} at {time_str} EAT."
    )


# ====================== EXISTING M-PESA SIGNAL (kept) ======================
@receiver(post_save, sender='mpesa_simulator.MpesaTransaction')
def create_mpesa_notification(sender, instance, created, **kwargs):
    if not created:
        return

    try:
        from .models import MpesaNotification

        instance.refresh_from_db()
        mpesa_id = instance.mpesa_id

        date_str, time_str = format_mpesa_date(instance.created_at)

        phone = instance.recipient_phone or "5515738"
        phone_link = f'<a href="tel:{phone}" class="text-ios-blue underline">{phone}</a>'

        if instance.transaction_type == 'deposit':
            message = (
                f"{mpesa_id} Confirmed.You have received Ksh{instance.amount:,.2f} from "
                f"{instance.recipient_name} {phone_link} on {date_str} at {time_str} "
                f"New M-PESA balance is Ksh{instance.mpesa_user.balance:,.2f}. "
                f"Download and try the Business App; Android https://bit.ly/lnm-app or "
                f"IOS https://bit.ly/LNM-app"
            )
            notif_type = 'received'

        elif instance.transaction_type == 'withdrawal':
            instance.mpesa_user.record_daily_withdrawal(instance.amount)
            remaining_limit = instance.mpesa_user.get_remaining_daily_limit()

            if instance.recipient_phone == "5515738" or instance.category == 'business':
                action_word = "paid to"
            else:
                action_word = "sent to"

            message = (
                f"{mpesa_id} Confirmed.Ksh{instance.amount:,.2f} {action_word} "
                f"{instance.recipient_name} {phone_link} on {date_str} at {time_str}. "
                f"New M-PESA balance is Ksh{instance.mpesa_user.balance:,.2f}. "
                f"Transaction cost, Ksh{instance.fee:,.2f}. "
                f"Amount you can transact within the day is {remaining_limit:,.2f}. "
                f"Download My OneApp on https://saf.cx/lPKcC"
            )
            notif_type = 'sent'

        else:
            message = f"{mpesa_id} {instance.transaction_type.capitalize()} of Ksh{instance.amount:,.2f} completed."
            notif_type = 'sent'

        if MpesaNotification.objects.filter(mpesa_transaction=instance).exists():
            return

        MpesaNotification.objects.create(
            mpesa_user=instance.mpesa_user,
            mpesa_transaction=instance,
            notification_type=notif_type,
            message=message,
            caller_id="MPESA",
            source="mpesa",
        )

        logger.info(f"✅ M-Pesa Notification created → {mpesa_id}")

    except Exception as e:
        logger.error(f"Failed to create M-Pesa notification: {e}", exc_info=True)


# ====================== EQUITY SIGNAL (FINAL) ======================
@receiver(post_save, sender='agents.AgentWithdrawal')
def create_equity_message_on_marketer_withdrawal(sender, instance, **kwargs):
    """
    When a marketer withdrawal is marked as 'completed':
    - Credit Equity balance
    - Create MpesaNotification (for popup)
    - Create EquityNotification (for Equity app inbox)
    - Send Equity-style email
    """
    if instance.status != 'completed':
        return

    user = instance.user

    is_marketer = (
        getattr(user, 'is_marketo', False) or
        getattr(user, 'is_marketer', False) or
        getattr(user, 'role', '') == 'marketer' or
        user.groups.filter(name='marketer').exists()
    )
    if not is_marketer:
        return

    try:
        from equity.models import EquityAccount, EquityTransaction, EquityNotification
        from .models import MpesaNotification

        with transaction.atomic():
            account, _ = EquityAccount.objects.get_or_create(
                user=user,
                is_primary=True,
                defaults={
                    'account_name': f"{user.get_full_name() or user.username} Equity",
                    'account_type': 'savings',
                    'balance': Decimal('0.00'),
                }
            )

            amount_kes = instance.amount_kes

            # Prevent double credit
            already_credited = EquityTransaction.objects.filter(
                related_agent_withdrawal=instance,
                transaction_type='withdrawal_credit'
            ).exists()

            if not already_credited:
                account.balance += amount_kes
                account.save(update_fields=['balance'])

                tx = EquityTransaction.objects.create(
                    account=account,
                    amount=amount_kes,
                    transaction_type='withdrawal_credit',
                    description=f"Marketer withdrawal via {instance.agent.name}",
                    balance_after=account.balance,
                    related_agent_withdrawal=instance
                )
            else:
                tx = EquityTransaction.objects.filter(
                    related_agent_withdrawal=instance,
                    transaction_type='withdrawal_credit'
                ).first()

            if not tx:
                logger.error(f"No EquityTransaction found for withdrawal {instance.id}")
                return

            sender_name = "SASHITRENDY TECHNOLOGY"
            sender_account = getattr(instance.agent, 'bank_account_number', None) or "0910186403723"

            message = format_equity_message(
                amount=amount_kes,
                sender_name=sender_name,
                sender_account=sender_account,
                receiver_account=account.account_number,
                reference=tx.reference,
                when=timezone.localtime()
            )

            # 1. Create MpesaNotification (for popup + main messages)
            if not MpesaNotification.objects.filter(
                equity_transaction_id=tx.reference,
                source='equity'
            ).exists():
                MpesaNotification.objects.create(
                    user=user,
                    source='equity',
                    notification_type='received',
                    message=message,
                    caller_id="Equity Bank",
                    equity_transaction_id=tx.reference,
                )

            # 2. Create EquityNotification (for Equity app Notifications screen)
            if not EquityNotification.objects.filter(
                user=user,
                data__reference=tx.reference
            ).exists():
                EquityNotification.objects.create(
                    user=user,
                    title="Money Received",
                    body=message,
                    data={
                        "type": "marketer_withdrawal_credit",
                        "amount": str(amount_kes),
                        "account_id": account.id,
                        "withdrawal_id": instance.id,
                        "reference": tx.reference,
                        "masked_sender": mask_account(sender_account),
                        "masked_receiver": mask_account(account.account_number),
                    }
                )
                logger.info(f"✅ EquityNotification created for {user.username} | Ref: {tx.reference}")

            # 3. Send Equity-style email
            try:
                email_body = f"""Dear {user.get_full_name() or user.username.upper()},

{message}

If you need any assistance, email us on info@equitybank.co.ke.

Regards,
Equity Bank""".strip()

                email = EmailMultiAlternatives(
                    subject="Money Received - Equity Bank",
                    body=email_body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[user.email]
                )
                email.send(fail_silently=False)
                logger.info(f"✅ Equity email sent to {user.email}")
            except Exception as email_err:
                logger.error(f"Failed to send Equity email: {email_err}")

            logger.info(
                f"✅ Equity message + email ready for marketer {user.username} | Ref: {tx.reference}"
            )

    except Exception as e:
        logger.error(f"Failed to create Equity message for withdrawal {instance.id}: {e}", exc_info=True)