# signals.py
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
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
    """Send email verification link when a new user is created"""
    if created and not instance.is_email_verified:
        token = default_token_generator.make_token(instance)
        uid = urlsafe_base64_encode(force_bytes(instance.pk))
        verify_link = f"https://traderiserapp.com/verify/{uid}/{token}/"

        subject = "Verify Your TradeRiser Account"
        html_message = f"""
        <h2>Welcome to TradeRiser!</h2>
        <p>Hi {instance.username},</p>
        <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
        <p style="text-align: center; margin: 30px 0;">
            <a href="{verify_link}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; font-weight: bold;">
                Verify My Email
            </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="{verify_link}">{verify_link}</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>Best regards,<br>TradeRiser Team</p>
        """

        send_mail(
            subject=subject,
            message=f"Click to verify your account: {verify_link}",  # plain text fallback
            from_email=None,                    # Uses DEFAULT_FROM_EMAIL from settings.py
            recipient_list=[instance.email],
            html_message=html_message,
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
        # Create wallet for new accounts
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


@receiver(pre_save, sender=User)
def create_referral_code_on_marketo(sender, instance, **kwargs):
    """Generate referral code for MarketO users"""
    if instance.is_marketo and not getattr(instance, 'referral_code', None):
        instance.referral_code = instance.generate_referral_code()


@receiver(post_save, sender=User)
def ensure_referral_code_exists(sender, instance, created, **kwargs):
    """Ensure MarketO users always have a referral code"""
    if instance.is_marketo and not instance.referral_code:
        instance.referral_code = instance.generate_referral_code()
        instance.save(update_fields=['referral_code'])


@receiver(post_save, sender=User)
def check_and_unsuspend_expired(sender, instance, **kwargs):
    """Clean up expired temporary suspensions"""
    if instance.is_temporarily_suspended:
        instance.clean_up_expired_suspension()


@receiver(post_save, sender=SuspensionEvidence)
def handle_evidence_review(sender, instance, **kwargs):
    """Handle approval or rejection of suspension appeals"""
    if kwargs.get('created'):
        return  # Skip on initial creation (appeal submission)

    # Only act if status was changed
    if 'status' in instance.get_dirty_fields():
        user = instance.user

        if instance.status == 'approved':
            # Unsuspend the user
            user.unsuspend(unsuspended_by=instance.reviewed_by)

            # Send approval email
            subject = "TradeRiser Account Recovered - Appeal Approved"
            html_message = f"""
            <h2>Welcome Back to TradeRiser!</h2>
            <p>Dear {user.username},</p>
            <p>Great news! Your appeal has been reviewed and <strong>approved</strong>.</p>
            <p>Your account has been fully reactivated. You can now log in and resume trading.</p>
            <p>If you have any questions, feel free to contact support.</p>
            <p>Best regards,<br>TradeRiser Team</p>
            """

            send_mail(
                subject=subject,
                message=f"Dear {user.username},\n\nYour appeal was approved. Your account has been recovered and is now active.\n\nWelcome back!\nTradeRiser Team",
                from_email=None,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )

        elif instance.status == 'rejected':
            # Send rejection email
            subject = "TradeRiser Appeal Review - Update"
            html_message = f"""
            <h2>Appeal Review Result</h2>
            <p>Dear {user.username},</p>
            <p>We have reviewed your appeal regarding your account suspension.</p>
            <p><strong>Result:</strong> Unfortunately, your appeal has been rejected.</p>
            <p><strong>Reason:</strong> {instance.description}</p>
            <p>Your account remains suspended. If you have additional information, you may submit another appeal.</p>
            <p>Contact support if you need further assistance.</p>
            <p>Best regards,<br>TradeRiser Team</p>
            """

            send_mail(
                subject=subject,
                message=f"Dear {user.username},\n\nYour appeal was reviewed and rejected. Your account remains suspended.\n\nReason: {instance.description}\nContact support for more info.\nTradeRiser Team",
                from_email=None,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )