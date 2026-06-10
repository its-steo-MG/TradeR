# mpesa_simulator/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from decimal import Decimal
import logging
from django.db import transaction

from wallet.models import WalletTransaction

logger = logging.getLogger('mpesa_simulator')


@receiver(post_save, sender='wallet.WalletTransaction')
def sync_wallet_to_mpesa(sender, instance, **kwargs):
    """Sync completed wallet transactions to M-Pesa Simulator"""
    if instance.status != 'completed' or not instance.mpesa_phone:
        return

    # Prevent duplicate processing
    if getattr(instance, '_mpesa_synced', False):
        return

    try:
        from .models import MpesaUser, MpesaTransaction

        mpesa_user = MpesaUser.objects.select_for_update().get(phone_number=instance.mpesa_phone)
        amount = instance.amount if instance.currency.code == 'KSH' else (instance.converted_amount or Decimal('0.00'))

        with transaction.atomic():
            if instance.transaction_type == 'withdrawal':
                # Wallet withdrawal = Money coming INTO M-Pesa (deposit)
                mpesa_user.balance += amount
                txn_type = 'deposit'

            elif instance.transaction_type == 'deposit':
                # Wallet deposit = Money going OUT of M-Pesa (withdrawal)
                if mpesa_user.balance < amount:
                    logger.warning(f"Insufficient M-Pesa balance for deposit sync {instance.id}")
                    return
                mpesa_user.balance -= amount
                txn_type = 'withdrawal'

            else:
                logger.warning(f"Unsupported transaction type: {instance.transaction_type}")
                return

            mpesa_user.save(update_fields=['balance'])

            # Create M-Pesa Transaction
            txn = MpesaTransaction(
                mpesa_user=mpesa_user,
                transaction_type=txn_type,
                amount=amount,
                description='SASHITRENDY TECH',
                reference=instance.reference_id,
                recipient_name='SASHITRENDY TECHNOLOGIES',
                recipient_phone='5515738',
                category='business',
            )
            txn._wallet_reference_id = instance.reference_id
            txn.save()

            # Mark as synced to prevent double processing
            instance._mpesa_synced = True
            # Note: We don't call instance.save() here to avoid recursion

            logger.info(f"Synced {instance.transaction_type} {instance.id} → M-Pesa {txn_type} | Balance now: {mpesa_user.balance}")

    except MpesaUser.DoesNotExist:
        logger.warning(f"No M-Pesa user found for phone {instance.mpesa_phone}")
    except Exception as e:
        logger.error(f"Error syncing wallet transaction {instance.id}: {e}", exc_info=True)