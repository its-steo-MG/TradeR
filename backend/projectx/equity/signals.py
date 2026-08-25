from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from decimal import Decimal
from agents.models import AgentWithdrawal
from .models import EquityAccount, EquityTransaction, EquityNotification
import logging

logger = logging.getLogger(__name__)


def mask_account(account_number: str) -> str:
    if not account_number:
        return "0***0000"
    account_number = str(account_number).strip()
    if len(account_number) <= 4:
        return f"0***{account_number}"
    return f"0***{account_number[-4:]}"


def format_equity_received_message(
    amount: Decimal,
    sender_name: str,
    sender_account: str,
    receiver_account: str,
    reference: str,
    when=None
) -> str:
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


@receiver(post_save, sender=AgentWithdrawal)
def create_equity_notification_only(sender, instance, **kwargs):
    """
    ONLY creates EquityNotification.
    Does NOT create EquityTransaction and does NOT touch the balance.
    The real credit happens in mpesa_message_notification.
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
        # Wait for the real transaction created by the other signal
        tx = EquityTransaction.objects.filter(
            related_agent_withdrawal=instance,
            transaction_type='withdrawal_credit'
        ).first()

        if not tx:
            # The other signal hasn't run yet or failed – just exit
            logger.warning(f"No EquityTransaction yet for withdrawal {instance.id} – skipping EquityNotification")
            return

        account = tx.account
        amount_kes = instance.amount_kes

        sender_name = "SASHITRENDY TECHNOLOGY"
        sender_account = getattr(instance.agent, 'bank_account_number', None) or "0910186403723"

        message_body = format_equity_received_message(
            amount=amount_kes,
            sender_name=sender_name,
            sender_account=sender_account,
            receiver_account=account.account_number,
            reference=tx.reference,
            when=timezone.localtime()
        )

        already_exists = EquityNotification.objects.filter(
            user=user,
            data__reference=tx.reference
        ).exists()

        if not already_exists:
            EquityNotification.objects.create(
                user=user,
                title="Money Received",
                body=message_body,
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

    except Exception as e:
        logger.error(f"Failed to create EquityNotification for withdrawal {instance.id}: {e}", exc_info=True)