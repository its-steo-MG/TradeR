# wallet/signals.py
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.db import transaction
from django.conf import settings
from django.utils import timezone
from django.core.mail import send_mail
from decimal import Decimal
import logging

from .models import WalletTransaction, Currency, Wallet
from accounts.models import Account
from dashboard.models import Transaction

logger = logging.getLogger('wallet')


@receiver(post_save, sender=Account)
def create_default_wallets(sender, instance, created, **kwargs):
    """
    Create default wallets when a new Account is created.
    Supports correct balances for:
    - Normal Demo → $10,000
    - MT5 Demo    → $100,000
    - Real accounts (Standard / MT5 Real) → $0.00
    """
    if not created:
        return

    usd, _ = Currency.objects.get_or_create(code='USD', defaults={'name': 'US Dollar', 'symbol': '$'})
    ksh, _ = Currency.objects.get_or_create(code='KSH', defaults={'name': 'Kenyan Shilling', 'symbol': 'KSh'})

    with transaction.atomic():
        # === Correct Initial Balance Logic ===
        if instance.platform == 'mt5' and instance.account_type == 'demo':
            initial_usd_balance = Decimal('100000.00')      # MT5 Demo
        elif instance.account_type == 'demo':
            initial_usd_balance = Decimal('10000.00')       # Normal Demo
        else:
            initial_usd_balance = Decimal('0.00')

        # Main USD Wallet
        Wallet.objects.get_or_create(
            account=instance,
            wallet_type='main',
            currency=usd,
            defaults={'balance': initial_usd_balance}
        )

        # Trading KSH Wallet (kept for compatibility)
        Wallet.objects.get_or_create(
            account=instance,
            wallet_type='trading',
            currency=ksh,
            defaults={'balance': Decimal('0.00')}
        )


@receiver(pre_save, sender=WalletTransaction)
def pre_save_wallet_transaction(sender, instance, **kwargs):
    """Store old status for comparison in post_save"""
    if instance.pk:
        try:
            old_instance = sender.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except sender.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender=WalletTransaction)
def post_save_wallet_transaction(sender, instance, **kwargs):
    """Handle balance updates and send emails when transaction status changes"""
    old_status = getattr(instance, '_old_status', None)
    
    if old_status == instance.status:
        return

    if old_status == 'failed':
        return

    user = instance.wallet.account.user
    wallet = instance.wallet

    if instance.status == 'completed' and old_status != 'completed':
        if not instance.completed_at:
            instance.completed_at = timezone.now()
            instance.save(update_fields=['completed_at'])

        with transaction.atomic():
            adjust_amount = None
            dashboard_type = None
            desc_prefix = None
            update_balance = False

            if instance.transaction_type == 'deposit':
                credit_amount = instance.converted_amount if instance.converted_amount else instance.amount
                wallet.balance += credit_amount
                update_balance = True
                adjust_amount = credit_amount
                dashboard_type = 'deposit'
                desc_prefix = "Deposit"

            elif instance.transaction_type == 'transfer_in':
                credit_amount = instance.amount
                wallet.balance += credit_amount
                update_balance = True
                adjust_amount = credit_amount
                dashboard_type = 'transfer_in'
                desc_prefix = "Received transfer"

            elif instance.transaction_type == 'transfer_out':
                debit_amount = instance.amount
                wallet.balance -= debit_amount
                update_balance = True
                adjust_amount = -debit_amount
                dashboard_type = 'transfer_out'
                desc_prefix = "Sent transfer"

            elif instance.transaction_type == 'withdrawal':
                adjust_amount = -instance.amount
                dashboard_type = 'withdrawal'
                desc_prefix = "Withdrawal"

            if update_balance:
                wallet.save()

            if adjust_amount is not None:
                Transaction.objects.create(
                    account=wallet.account,
                    amount=adjust_amount,
                    transaction_type=dashboard_type,
                    description=f"{desc_prefix}: {instance.reference_id}"
                )

            # Success Emails
            try:
                if instance.transaction_type == 'deposit':
                    send_mail(
                        subject="Deposit Approved & Credited!",
                        message=f"Hi {user.username},\n\nYour deposit has been approved.\nReference: {instance.reference_id}",
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[user.email],
                        fail_silently=True
                    )
                elif instance.transaction_type == 'withdrawal':
                    send_mail(
                        subject="Withdrawal Completed",
                        message=f"Hi {user.username},\n\nYour withdrawal has been completed.\nReference: {instance.reference_id}",
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[user.email],
                        fail_silently=True
                    )
            except Exception as e:
                logger.error(f"Failed to send email: {e}")

    elif instance.status == 'failed' and old_status != 'failed':
        try:
            if instance.transaction_type in ['deposit', 'withdrawal']:
                send_mail(
                    subject=f"{instance.transaction_type.title()} Failed",
                    message=f"Hi {user.username},\n\nYour {instance.transaction_type} failed.\nReference: {instance.reference_id}",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=True
                )
        except Exception as e:
            logger.error(f"Failed to send failure email: {e}")