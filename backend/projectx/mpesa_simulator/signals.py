# mpesa_simulator/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from decimal import Decimal
import logging

from wallet.models import WalletTransaction

logger = logging.getLogger('mpesa_simulator')

@receiver(post_save, sender='wallet.WalletTransaction')
def sync_wallet_to_mpesa(sender, instance, **kwargs):
    if instance.status != 'completed' or not instance.mpesa_phone:
        return

    try:
        from .models import MpesaUser, MpesaTransaction

        mpesa_user = MpesaUser.objects.get(phone_number=instance.mpesa_phone)
        amount = instance.amount if instance.currency.code == 'KSH' else instance.converted_amount or Decimal('0.00')

        FIXED_REFERENCE = '5515738'  # Fixed for all synced transactions

        if instance.transaction_type == 'withdrawal':
            # Sync as deposit to M-Pesa
            mpesa_user.balance += amount
            mpesa_user.save()

            MpesaTransaction.objects.create(
                mpesa_user=mpesa_user,
                transaction_type='deposit',
                amount=amount,
                description='SASHITRENDY TECH',
                reference=FIXED_REFERENCE,  # Same reference for all
                recipient_name='SASHITRENDY TECHNOLOGIES',
                recipient_phone='5515738',
                category='business',
                # mpesa_id left blank → auto-generated uniquely in save()
            )
            logger.info(f"Synced withdrawal {instance.id} as deposit to M-Pesa for {mpesa_user.user.username}")

        elif instance.transaction_type == 'deposit':
            # Sync as withdrawal from M-Pesa
            if mpesa_user.balance < amount:
                logger.warning(f"Insufficient M-Pesa balance for deposit sync {instance.id} for {mpesa_user.user.username}")
                return  # Keep this if you want to skip on low balance; remove if always create

            mpesa_user.balance -= amount
            mpesa_user.save()

            MpesaTransaction.objects.create(
                mpesa_user=mpesa_user,
                transaction_type='withdrawal',
                amount=amount,
                description='SASHITRENDY TECH',
                reference=FIXED_REFERENCE,  # Same reference for all
                recipient_name='SASHITRENDY TECHNOLOGIES',
                recipient_phone='5515738',
                category='business',
                # mpesa_id left blank → auto-generated uniquely in save()
            )
            logger.info(f"Synced deposit {instance.id} as withdrawal from M-Pesa for {mpesa_user.user.username}")

    except MpesaUser.DoesNotExist:
        logger.warning(f"No M-Pesa user found for phone {instance.mpesa_phone}")
    except Exception as e:
        logger.error(f"Error syncing wallet transaction {instance.id}: {e}")