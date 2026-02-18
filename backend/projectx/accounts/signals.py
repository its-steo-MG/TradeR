# signals.py
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from accounts.models import User, Account
from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from .models import User, Account, SuspensionEvidence
from wallet.models import Wallet
from django.apps import apps
from decimal import Decimal
import logging

logger = logging.getLogger('accounts')

@receiver(post_save, sender=User)
def send_verification_email(sender, instance, created, **kwargs):
    if created and not instance.is_email_verified:
        token = default_token_generator.make_token(instance)
        uid = urlsafe_base64_encode(force_bytes(instance.pk))
        verify_link = f"https://traderiserapp.com/verify/{uid}/{token}/"
        send_mail(
            'Verify Your TradeRiser Account',
            f'Click to verify: {verify_link}',
            'no-reply@traderiser.com',
            [instance.email],
            fail_silently=False,
        )

@receiver(post_save, sender=Account)
def sync_account_to_wallet(sender, instance, **kwargs):
    """Sync Account.balance to the main USD wallet balance if different."""
    try:
        wallet = Wallet.objects.get(account=instance, wallet_type='main', currency__code='USD')
        if wallet.balance != instance.balance:
            wallet.balance = instance.balance
            wallet.save(update_fields=['balance'])
            logger.info(f"Synced Wallet {wallet.id} balance to {instance.balance} from Account {instance.id}")
    except Wallet.DoesNotExist:
        # Create wallet for new accounts (especially pro-fx with zero balance)
        Currency = apps.get_model('wallet', 'Currency')
        usd = Currency.objects.get_or_create(code='USD', defaults={'name': 'US Dollar', 'symbol': '$'})[0]
        initial_balance = Decimal('10000.00') if instance.account_type == 'demo' else Decimal('0.00')
        Wallet.objects.create(
            account=instance,
            wallet_type='main',
            currency=usd,
            balance=initial_balance
        )
        logger.info(f"Created main USD wallet for Account {instance.id} with balance {initial_balance}")
    except Exception as e:
        logger.error(f"Failed to sync Account {instance.id} to wallet: {str(e)}")

# signals.py — improve pre_save to be more defensive
@receiver(pre_save, sender=User)
def create_referral_code_on_marketo(sender, instance, **kwargs):
    if instance.is_marketo and not getattr(instance, 'referral_code', None):
        instance.referral_code = instance.generate_referral_code()


@receiver(post_save, sender=User)
def ensure_referral_code_exists(sender, instance, created, **kwargs):
    if instance.is_marketo and not instance.referral_code:
        instance.referral_code = instance.generate_referral_code()
        instance.save(update_fields=['referral_code'])

@receiver(post_save, sender=User)
def check_and_unsuspend_expired(sender, instance, **kwargs):
    if instance.is_temporarily_suspended:
        instance.clean_up_expired_suspension()
        if not instance.is_suspended:  # Was unsuspended
            # Re-send welcome email or something
            pass
@receiver(post_save, sender=SuspensionEvidence)
def handle_evidence_review(sender, instance, **kwargs):
    if kwargs.get('created'):
        return  # Skip on create (appeal submission)

    # Check if status changed
    if 'status' in instance.get_dirty_fields():
        user = instance.user
        if instance.status == 'approved':
            # Unsuspend and notify
            user.unsuspend(unsuspended_by=instance.reviewed_by)
            send_mail(
                "TradeRiser Account Recovered",
                f"Dear {user.username},\n\nYour appeal was approved. Your account has been recovered and is now active.\n\nWelcome back!\nTradeRiser Team",
                'no-reply@traderiser.com',
                [user.email],
                fail_silently=False
            )
        elif instance.status == 'rejected':
            # Notify rejection
            send_mail(
                "TradeRiser Appeal Rejected",
                f"Dear {user.username},\n\nYour appeal was reviewed and rejected. Your account remains suspended.\n\nReason: {instance.description}\nContact support for more info.\nTradeRiser Team",
                'no-reply@traderiser.com',
                [user.email],
                fail_silently=False
            )