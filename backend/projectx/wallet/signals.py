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
    if created:
        usd, _ = Currency.objects.get_or_create(code='USD', defaults={'name': 'US Dollar', 'symbol': '$'})
        ksh, _ = Currency.objects.get_or_create(code='KSH', defaults={'name': 'Kenyan Shilling', 'symbol': 'KSh'})
        with transaction.atomic():
            initial_usd_balance = Decimal('10000.00') if instance.account_type == 'demo' else Decimal('0.00')
            Wallet.objects.get_or_create(
                account=instance, wallet_type='main', currency=usd,
                defaults={'balance': initial_usd_balance}
            )
            Wallet.objects.get_or_create(
                account=instance, wallet_type='trading', currency=ksh,
                defaults={'balance': Decimal('0.00')}
            )


@receiver(pre_save, sender=WalletTransaction)
def pre_save_wallet_transaction(sender, instance, **kwargs):
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
    old_status = getattr(instance, '_old_status', None)
    if old_status == instance.status:
        return  # No status change

    if old_status == 'failed':
        return  # Admin must manually approve

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

                # ────────────────────────────────────────────────
                # Referral commission → only email notification (no credit)
                # ────────────────────────────────────────────────
                if hasattr(user, 'referred_by') and user.referred_by:
                    upline = user.referred_by
                    commission_rate = Decimal('0.80')  # 80% commission
                    commission_usd = (credit_amount * commission_rate).quantize(Decimal('0.01'))

                    try:
                        comm_ref = f"COMM-{instance.reference_id}"  # or use generate_reference_id() if needed

                        # Only send notification email — no wallet credit, no Transaction creation
                        send_mail(
                            subject="Client Deposit – Commission Earned!",
                            message=(
                                f"Hi {upline.username},\n\n"
                                f"Your client {user.username} has successfully deposited "
                                f"{instance.amount} {instance.currency.code} "
                                f"(equivalent to {credit_amount:.2f} USD).\n\n"
                                f"You have earned 80% commission: {commission_usd:.2f} USD.\n"
                                f"This will be credited to your account soon.\n"
                                f"Reference: {comm_ref}\n\n"
                                f"Thank you for growing the TradeRiser community!"
                            ),
                            from_email=settings.DEFAULT_FROM_EMAIL,
                            recipient_list=[upline.email],
                            fail_silently=True,
                        )

                        logger.info(
                            f"Commission notification sent to {upline.username} for deposit {instance.reference_id} "
                            f"({commission_usd:.2f} USD earned)"
                        )

                    except Exception as e:
                        logger.error(
                            f"Failed to send commission notification for deposit {instance.reference_id} "
                            f"(upline: {upline.username}): {str(e)}"
                        )

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

            else:
                return

            if update_balance:
                wallet.save()

            # Dashboard record for the main user
            if adjust_amount is not None:
                Transaction.objects.create(
                    account=wallet.account,
                    amount=adjust_amount,
                    transaction_type=dashboard_type,
                    description=f"{desc_prefix}: {instance.reference_id}"
                )

            # Success emails
            try:
                if instance.transaction_type == 'deposit':
                    send_mail(
                        "Deposit Approved!",
                        f"Hi {user.username},\n\nYour deposit of {instance.amount} {instance.currency.code} has been approved.\n"
                        f"{instance.converted_amount or credit_amount:.2f} USD credited.\n"
                        f"Ref: {instance.reference_id}",
                        settings.DEFAULT_FROM_EMAIL,
                        [user.email],
                        fail_silently=True
                    )
                elif instance.transaction_type == 'withdrawal':
                    send_mail(
                        "Withdrawal Paid!",
                        f"Hi {user.username},\n\n{instance.amount} {instance.currency.code} has been sent to {instance.mpesa_phone or 'your account'}.\n"
                        f"Ref: {instance.reference_id}",
                        settings.DEFAULT_FROM_EMAIL,
                        [user.email],
                        fail_silently=True
                    )
                elif instance.transaction_type == 'transfer_in':
                    from_user = instance.description.split('from ')[-1] if 'from ' in instance.description else 'another user'
                    send_mail(
                        "You Received Funds!",
                        f"Hi {user.username},\n\nYou have received ${instance.amount} USD in your {wallet.account.account_type} account.\n"
                        f"From: {from_user}\nRef: {instance.reference_id}",
                        settings.DEFAULT_FROM_EMAIL,
                        [user.email],
                        fail_silently=True
                    )
            except Exception as e:
                logger.error(f"Failed to send completion email for {instance.reference_id}: {str(e)}")

    elif instance.status == 'failed' and old_status != 'failed':
        try:
            if instance.transaction_type == 'deposit':
                send_mail(
                    "Deposit Failed",
                    f"Hi {user.username},\n\nYour deposit of {instance.amount} {instance.currency.code} failed.\nRef: {instance.reference_id}",
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=True
                )
            elif instance.transaction_type == 'withdrawal':
                send_mail(
                    "Withdrawal Failed",
                    f"Hi {user.username},\n\nYour withdrawal of {instance.amount} {instance.currency.code} failed.\nRef: {instance.reference_id}",
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=True
                )
        except Exception as e:
            logger.error(f"Failed to send failure email for {instance.reference_id}: {str(e)}")