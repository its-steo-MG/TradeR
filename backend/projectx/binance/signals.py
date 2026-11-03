from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from django.contrib.auth import get_user_model
from decimal import Decimal
from agents.models import AgentWithdrawal
from .models import BinanceWallet, BinanceTransaction, BinanceNotification
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


def mask_address(address: str) -> str:
    if not address or len(address) < 10:
        return "0x***"
    return f"{address[:6]}...{address[-4:]}"


def format_binance_received_message(
    amount: Decimal,
    sender_name: str,
    sender_address: str,
    receiver_address: str,
    reference: str,
    network: str = "BEP20",
    currency: str = "USDT",
    when=None
) -> str:
    if when is None:
        when = timezone.localtime()

    amount_str = f"{amount:,.2f}"
    masked_sender = mask_address(sender_address)
    masked_receiver = mask_address(receiver_address)

    date_str = when.strftime("%d %b %Y")
    time_str = when.strftime("%H:%M")

    return (
        f"Dear Binancian,\n\n"
        f"You have received {amount_str} {currency} from {sender_name} "
        f"({masked_sender}) to your Binance wallet {masked_receiver} on {network}.\n\n"
        f"Transaction details:\n"
        f"Amount: {amount_str} {currency}\n"
        f"Network: {network}\n"
        f"Ref: {reference}\n"
        f"{date_str}, {time_str} EAT\n\n"
        f"This is an automated message, please do not reply."
    )


@receiver(post_save, sender=User)
def create_binance_wallet_on_user_create(sender, instance, created, **kwargs):
    """Auto-create primary Binance wallet (address + UID) when a new user signs up."""
    if not created:
        return
    if BinanceWallet.objects.filter(user=instance, is_primary=True).exists():
        return
    try:
        BinanceWallet.objects.create(
            user=instance,
            is_primary=True,
            label="Main Wallet",
            network="BEP20",
            currency="USDT",
        )
        logger.info(f"Created Binance wallet + UID for new user {instance.username}")
    except Exception as e:
        logger.error(f"Failed to create Binance wallet for {instance.username}: {e}")


@receiver(post_save, sender=BinanceNotification)
def dispatch_binance_notification(sender, instance, created, **kwargs):
    if not created:
        return
    from django.db import transaction
    from .delivery import deliver_notification
    transaction.on_commit(lambda pk=instance.pk: deliver_notification(pk), robust=True)


@receiver(post_save, sender=AgentWithdrawal)
def credit_binance_wallet_on_completion(sender, instance, **kwargs):
    if instance.status != 'completed':
        return
    if instance.payment_method != 'binance':
        return

    user = instance.user

    if BinanceTransaction.objects.filter(
        related_agent_withdrawal=instance,
        transaction_type='withdrawal_credit'
    ).exists():
        return

    try:
        wallet, _ = BinanceWallet.objects.get_or_create(
            user=user,
            is_primary=True,
            defaults={
                'label': 'Main Wallet',
                'network': 'BEP20',
                'currency': 'USDT',
            }
        )

        amount_usd = instance.amount_usd
        wallet.balance += amount_usd
        wallet.save(update_fields=['balance'])

        tx = BinanceTransaction.objects.create(
            wallet=wallet,
            amount=amount_usd,
            transaction_type='withdrawal_credit',
            description=f"Received from TradeRiser via {instance.agent.name}",
            balance_after=wallet.balance,
            related_agent_withdrawal=instance
        )

        sender_name = "TradeRiser"
        sender_address = getattr(instance.agent, 'binance_address', None) or "0xTradeRiserHotWallet"

        message_body = format_binance_received_message(
            amount=amount_usd,
            sender_name=sender_name,
            sender_address=sender_address,
            receiver_address=wallet.address,
            reference=tx.reference,
            network=wallet.network,
            currency=wallet.currency,
            when=timezone.localtime()
        )

        BinanceNotification.objects.create(
            user=user,
            title="USDT Received",
            body=message_body,
            data={
                "type": "agent_withdrawal_credit",
                "amount": str(amount_usd),
                "wallet_id": wallet.id,
                "withdrawal_id": instance.id,
                "reference": tx.reference,
                "network": wallet.network,
                "masked_sender": mask_address(sender_address),
                "masked_receiver": mask_address(wallet.address),
            }
        )

        logger.info(
            f"✅ Binance wallet credited for {user.username} | "
            f"Amount: {amount_usd} USDT | Ref: {tx.reference}"
        )

    except Exception as e:
        logger.error(
            f"Failed to credit Binance wallet for withdrawal {instance.id}: {e}",
            exc_info=True
        )
