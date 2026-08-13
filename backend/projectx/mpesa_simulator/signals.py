# mpesa_simulator/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from decimal import Decimal
import logging
from django.db import transaction
from django.utils import timezone

from wallet.models import WalletTransaction
from notifications.utils import send_web_push

logger = logging.getLogger('mpesa_simulator')


@receiver(post_save, sender=WalletTransaction)
def sync_wallet_to_mpesa(sender, instance, **kwargs):
    """
    Wallet Withdrawal → Deposit into M-PESA (adds to M-PESA balance)
    Wallet Deposit   → Withdrawal from M-PESA (deducts from M-PESA balance)
    """

    if instance.status != 'completed' or not instance.mpesa_phone:
        return

    if getattr(instance, '_mpesa_synced', False):
        return

    try:
        from .models import MpesaUser, MpesaTransaction

        with transaction.atomic():
            mpesa_user = MpesaUser.objects.select_for_update().get(
                phone_number=instance.mpesa_phone
            )

            amount = instance.amount if getattr(instance.currency, 'code', None) == 'KSH' else \
                     (instance.converted_amount or Decimal('0.00'))

            if instance.transaction_type == 'withdrawal':
                # Wallet Withdrawal → Money goes INTO M-PESA
                mpesa_user.balance += amount
                txn_type = 'deposit'

            elif instance.transaction_type == 'deposit':
                # Wallet Deposit → Money comes OUT of M-PESA
                if mpesa_user.balance < amount:
                    logger.warning(f"Insufficient M-PESA balance for deposit sync {instance.id}")
                    return
                mpesa_user.balance -= amount
                txn_type = 'withdrawal'

            else:
                return

            mpesa_user.save(update_fields=['balance'])

            # Create M-PESA transaction record
            mpesa_tx = MpesaTransaction.objects.create(
                mpesa_user=mpesa_user,
                transaction_type=txn_type,
                amount=amount,
                description='SASHITRENDY TECH',
                reference=instance.reference_id or '5515738',
                recipient_name='SASHITRENDY TECHNOLOGIES',
                recipient_phone='5515738',
                category='business',
            )

            # Mark as synced
            instance._mpesa_synced = True

            logger.info(f"✅ Synced Wallet {instance.transaction_type} → M-PESA {txn_type} | Amount: {amount}")

            # ===== SEND PROFESSIONAL TRADE RISER PUSH =====
            try:
                user = mpesa_user.user
                user_name = user.get_full_name() or user.username
                now = timezone.localtime()
                date_str = f"{now.day}/{now.month}/{now.strftime('%y')}"
                hour = now.strftime("%I").lstrip("0") or "12"
                time_str = f"{hour}:{now.strftime('%M')} {now.strftime('%p')}"

                if instance.transaction_type == 'withdrawal':
                    # Money sent to user's M-Pesa
                    send_web_push(
                        user=user,
                        title="TradeRiser",
                        body=(
                            f"Dear {user_name},\n\n"
                            f"TradeRiser has successfully sent Ksh {amount:,.2f} to your M-Pesa.\n\n"
                            f"Transaction Code: {mpesa_tx.mpesa_id}\n"
                            f"Date: {date_str} at {time_str}\n\n"
                            f"Thank you for using TradeRiser."
                        ),
                        data={
                            "type": "withdrawal",
                            "reference": instance.reference_id,
                            "mpesa_id": mpesa_tx.mpesa_id,
                        }
                    )

                elif instance.transaction_type == 'deposit':
                    # Money taken from M-Pesa into wallet
                    send_web_push(
                        user=user,
                        title="TradeRiser",
                        body=(
                            f"Dear {user_name},\n\n"
                            f"TradeRiser has successfully credited your wallet.\n\n"
                            f"Amount: Ksh {amount:,.2f}\n"
                            f"Transaction Code: {mpesa_tx.mpesa_id}\n"
                            f"Date: {date_str} at {time_str}\n\n"
                            f"Thank you for using TradeRiser."
                        ),
                        data={
                            "type": "deposit",
                            "reference": instance.reference_id,
                            "mpesa_id": mpesa_tx.mpesa_id,
                        }
                    )

            except Exception as push_err:
                logger.error(f"Failed to send TradeRiser push: {push_err}")

    except MpesaUser.DoesNotExist:
        logger.warning(f"No M-Pesa user found for phone {instance.mpesa_phone}")
    except Exception as e:
        logger.error(f"Error syncing wallet transaction {instance.id}: {e}", exp_info=True)