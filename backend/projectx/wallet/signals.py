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
from notifications.utils import send_web_push   # ← added

logger = logging.getLogger('wallet')


def format_mpesa_date(dt):
    """Cross-platform date formatting (works on Windows and Linux)"""
    date_str = f"{dt.day}/{dt.month}/{dt.strftime('%y')}"
    hour = dt.strftime("%I").lstrip("0") or "12"
    time_str = f"{hour}:{dt.strftime('%M')} {dt.strftime('%p')}"
    return date_str, time_str


@receiver(post_save, sender=Account)
def create_default_wallets(sender, instance, created, **kwargs):
    """Create default USD and KSH wallets when a new account is created"""
    if created:
        usd, _ = Currency.objects.get_or_create(code='USD', defaults={'name': 'US Dollar', 'symbol': '$'})
        ksh, _ = Currency.objects.get_or_create(code='KSH', defaults={'name': 'Kenyan Shilling', 'symbol': 'KSh'})
        
        with transaction.atomic():
            initial_usd_balance = Decimal('10000.00') if instance.account_type == 'demo' else Decimal('0.00')
            Wallet.objects.get_or_create(
                account=instance, 
                wallet_type='main', 
                currency=usd,
                defaults={'balance': initial_usd_balance}
            )
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
        return  # No status change

    if old_status == 'failed':
        return  # Prevent re-processing failed transactions

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

                # Referral commission notification
                if hasattr(user, 'referred_by') and user.referred_by:
                    upline = user.referred_by
                    commission_rate = Decimal('0.80')
                    commission_usd = (credit_amount * commission_rate).quantize(Decimal('0.01'))

                    try:
                        send_mail(
                            subject="Client Deposit – Commission Earned!",
                            message=(
                                f"Hi {upline.username},\n\n"
                                f"Your client {user.username} has successfully deposited "
                                f"{instance.amount} {instance.currency.code} "
                                f"(equivalent to {credit_amount:.2f} USD).\n\n"
                                f"You have earned 80% commission: ${commission_usd:.2f} USD.\n"
                                f"This will be credited to your account soon.\n"
                                f"Reference: {instance.reference_id}\n\n"
                                f"Thank you for growing TradeRiser!"
                            ),
                            from_email=settings.DEFAULT_FROM_EMAIL,
                            recipient_list=[upline.email],
                            fail_silently=True,
                        )
                    except Exception as e:
                        logger.error(f"Failed to send commission notification: {e}")

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

            # Create dashboard record
            if adjust_amount is not None:
                Transaction.objects.create(
                    account=wallet.account,
                    amount=adjust_amount,
                    transaction_type=dashboard_type,
                    description=f"{desc_prefix}: {instance.reference_id}"
                )

            # ====================== SUCCESS EMAILS ======================
            try:
                if instance.transaction_type == 'deposit':
                    send_mail(
                        subject="Deposit Approved & Credited!",
                        message=(
                            f"Hi {user.username},\n\n"
                            f"Your deposit of {instance.amount} {instance.currency.code} "
                            f"has been approved.\n\n"
                            f"${instance.converted_amount or credit_amount:.2f} USD has been credited to your "
                            f"{wallet.account.account_type} account.\n\n"
                            f"Reference: {instance.reference_id}\n"
                            f"Thank you for using TradeRiser!"
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[user.email],
                        fail_silently=True
                    )

                elif instance.transaction_type == 'withdrawal':
                    if "Auto-approved for Marketo" in (instance.description or ""):
                        logger.info(f"Skipping signal email for Marketo auto-withdrawal {instance.reference_id}")
                    else:
                        send_mail(
                            subject="Withdrawal Completed",
                            message=(
                                f"Hi {user.username},\n\n"
                                f"Your withdrawal of {instance.amount} {instance.currency.code} "
                                f"has been successfully sent to {instance.mpesa_phone or 'your account'}.\n\n"
                                f"Reference: {instance.reference_id}\n"
                                f"Thank you for using TradeRiser!"
                            ),
                            from_email=settings.DEFAULT_FROM_EMAIL,
                            recipient_list=[user.email],
                            fail_silently=True
                        )

                elif instance.transaction_type == 'transfer_in':
                    from_user = instance.description.split('from ')[-1] if 'from ' in (instance.description or "") else 'another user'
                    send_mail(
                        subject="Funds Received!",
                        message=(
                            f"Hi {user.username},\n\n"
                            f"You have received ${instance.amount} USD in your {wallet.account.account_type} account.\n\n"
                            f"From: {from_user}\n"
                            f"Reference: {instance.reference_id}\n"
                            f"Best regards,\nTradeRiser Team"
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[user.email],
                        fail_silently=True
                    )
            except Exception as e:
                logger.error(f"Failed to send completion email for {instance.reference_id}: {e}")

            # ====================== PUSH NOTIFICATIONS ======================
            try:
                if instance.transaction_type == 'deposit':
                    amount_display = instance.converted_amount or instance.amount
                    send_web_push(
                        user=user,
                        title="TradeRiser",
                        body=(
                            f"Dear Trader,\n"
                            f"TradeRiser has credited ${amount_display} to your wallet.\n"
                            f"Reference: {instance.reference_id}"
                        ),
                        data={
                            "type": "deposit",
                            "reference": instance.reference_id,
                        }
                    )

                elif instance.transaction_type == 'withdrawal':
                    # For withdrawals we try to show a nicer message
                    amount_kes = instance.converted_amount or instance.amount
                    mpesa_code = instance.reference_id or "N/A"

                    send_web_push(
                        user=user,
                        title="TradeRiser",
                        body=(
                            f"Dear Trader,\n"
                            f"TradeRiser has sent you Ksh {amount_kes}.\n"
                            f"M-Pesa Code: {mpesa_code}\n"
                            f"Please check your M-Pesa balance."
                        ),
                        data={
                            "type": "withdrawal",
                            "reference": instance.reference_id,
                        }
                    )

            except Exception as e:
                logger.error(f"Failed to send push notification: {e}")