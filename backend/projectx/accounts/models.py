from django.contrib.auth.models import AbstractUser
from django.db import models
from django.contrib.auth.validators import UnicodeUsernameValidator
from storages.backends.s3boto3 import S3Boto3Storage
from decimal import Decimal
from django.apps import apps
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail
import uuid
import logging

logger = logging.getLogger('accounts')


class User(AbstractUser):
    username_validator = UnicodeUsernameValidator()

    username = models.CharField(
        max_length=150,
        unique=True,
        help_text='Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.',
        validators=[username_validator],
    )
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    is_sashi = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    is_marketo = models.BooleanField(default=False)
    referral_code = models.CharField(max_length=12, unique=True, blank=True, null=True)
    referred_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='referred_users'
    )
    kyc_status = models.CharField(
        max_length=20, 
        choices=[
            ('not_submitted', 'Not Submitted'),
            ('pending', 'Pending Review'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected')
        ], 
        default='not_submitted'
    )
    kyc_submitted_at = models.DateTimeField(null=True, blank=True)
    
    # Suspension fields
    is_suspended = models.BooleanField(default=False, verbose_name="Account Suspended")
    suspension_type = models.CharField(
        max_length=20,
        choices=[('temporary', 'Temporary'), ('permanent', 'Permanent')],
        blank=True,
        default='',
        verbose_name="Suspension Type"
    )
    suspension_reason = models.TextField(blank=True, verbose_name="Suspension Reason")
    suspended_at = models.DateTimeField(null=True, blank=True, verbose_name="Suspended At")
    suspended_until = models.DateTimeField(null=True, blank=True, verbose_name="Suspended Until (Temporary)")
    suspension_history = models.JSONField(default=list, blank=True, verbose_name="Suspension History")

    class Meta:
        indexes = [models.Index(fields=['referral_code'])]

    def generate_referral_code(self):
        code = f"MRK-{uuid.uuid4().hex[:8].upper()}"
        while User.objects.filter(referral_code=code).exists():
            code = f"MRK-{uuid.uuid4().hex[:8].upper()}"
        return code

    def __str__(self):
        return self.username

    # ====================== MULTI-PLATFORM ACCOUNT LOGIC ======================
    def can_create_account(self, account_type: str, platform: str = 'traderiser') -> bool:
        """Extended for MT5 and Deriv"""
        existing_accounts = self.accounts.filter(platform=platform)
        existing_types = {acc.account_type for acc in existing_accounts}

        if platform == 'mt5':
            if account_type in ['mt5-demo', 'demo']:
                return 'mt5-demo' not in existing_types
            if account_type == 'mt5':
                return 'mt5' not in existing_types
            return False

        if platform == 'deriv':
            if account_type == 'deriv-demo':
                return 'deriv-demo' not in existing_types
            if account_type == 'deriv':
                return 'deriv' not in existing_types  # Usually after KYC
            return False

        # Traderiser platform (original logic)
        if len(existing_accounts) >= 3:
            return False
        if account_type == 'demo' and 'demo' in existing_types:
            return False
        if account_type == 'standard' and 'standard' in existing_types:
            return False
        if account_type == 'pro-fx':
            return 'standard' in existing_types and 'pro-fx' not in existing_types
        if account_type not in ['standard', 'demo', 'pro-fx']:
            return False
        return True

    def create_default_accounts(self):
        """Create default accounts: Traderiser + MT5 only (no Deriv demo)"""
        defaults = [
            {'platform': 'traderiser', 'account_type': 'demo'},
            {'platform': 'traderiser', 'account_type': 'standard'},
            {'platform': 'mt5', 'account_type': 'mt5-demo'},
            {'platform': 'mt5', 'account_type': 'mt5'},
        ]

        created = []
        for data in defaults:
            account, created_flag = Account.objects.get_or_create(
                user=self,
                platform=data['platform'],
                account_type=data['account_type']
            )
            if created_flag:
                created.append(f"{data['platform']}-{data['account_type']}")

        logger.info(f"Created default accounts for {self.username}: {created}")
        return created

        # ====================== SUSPENSION METHODS ======================
    def suspend(self, suspension_type: str, reason: str, duration_days: int = None, suspended_by=None):
        """Suspend user (temporary or permanent)"""
        self.is_suspended = True
        self.suspension_type = suspension_type
        self.suspension_reason = reason
        self.suspended_at = timezone.now()

        if suspension_type == 'temporary' and duration_days:
            self.suspended_until = timezone.now() + timedelta(days=duration_days)
        else:
            self.suspended_until = None

        # Log to history
        history_entry = {
            'type': 'suspended',
            'suspension_type': suspension_type,
            'reason': reason,
            'date': self.suspended_at.isoformat(),
            'suspended_by': suspended_by.username if suspended_by else 'admin'
        }
        self.suspension_history.append(history_entry)

        self.save()

        logger.info(f"User {self.username} suspended ({suspension_type})")

    def unsuspend(self, unsuspended_by=None):
        """Unsuspend user and log it"""
        if not self.is_suspended:
            return

        self.is_suspended = False
        self.suspension_type = ''
        self.suspension_reason = ''
        self.suspended_at = None
        self.suspended_until = None

        # Log to history
        history_entry = {
            'type': 'unsuspended',
            'reason': 'Admin unsuspended' if unsuspended_by else 'Automatic expiration',
            'date': timezone.now().isoformat(),
            'unsuspended_by': unsuspended_by.username if unsuspended_by else 'system'
        }
        self.suspension_history.append(history_entry)

        self.save()

        logger.info(f"User {self.username} unsuspended")
    @property
    def is_permanently_suspended(self):
        return self.is_suspended and self.suspension_type == 'permanent'

    @property
    def is_temporarily_suspended(self):
        if not self.is_suspended or self.suspension_type != 'temporary':
            return False
        return not self.suspended_until or self.suspended_until > timezone.now()

    def clean_up_expired_suspension(self):
        if self.is_temporarily_suspended and self.suspended_until <= timezone.now():
            self.unsuspend()


# ====================== OTHER MODELS ======================
class SuspensionEvidence(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='suspension_evidence')
    evidence_file = models.FileField(upload_to='suspension_evidence/%Y/%m/%d/', blank=True)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_evidence')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Evidence for {self.user.username} - {self.status}"

class Account(models.Model):
    PLATFORM_CHOICES = [
        ('traderiser', 'Traderiser'),
        ('mt5', 'MT5'),
        ('deriv', 'Deriv'),
    ]

    ACCOUNT_TYPES = [
        ('standard', 'TradeRiser Standard'),
        ('pro', 'TradeRiser Pro'),
        ('islamic', 'TradeRiser Islamic'),
        ('options', 'TradeRiser Options'),
        ('crypto', 'TradeRiser Crypto'),
        ('demo', 'TradeRiser Demo'),
        ('pro-fx', 'TradeRiser Pro-FX'),
        # MT5
        ('mt5', 'MT5 Real'),
        ('mt5-demo', 'MT5 Demo'),
        # Deriv
        ('deriv', 'Deriv Real'),
        ('deriv-demo', 'Deriv Demo'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='accounts')
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES, default='traderiser')
    account_type = models.CharField(max_length=50, choices=ACCOUNT_TYPES)
    
    # Platform-specific credentials
    mt5_login = models.CharField(max_length=50, blank=True, null=True)
    mt5_password = models.CharField(max_length=128, blank=True, null=True)
    mt5_server = models.CharField(max_length=100, blank=True, null=True)

    deriv_login = models.CharField(max_length=50, blank=True, null=True)
    deriv_token = models.CharField(max_length=255, blank=True, null=True)  # Store encrypted in production
    deriv_server = models.CharField(max_length=100, blank=True, null=True, default='green.derivws.com')

    is_wallet_verified = models.BooleanField(
        default=True,
        verbose_name="Wallet Verified",
        help_text="Uncheck this to block withdrawals and internal transfers."
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'platform', 'account_type')
        ordering = ['-created_at']
        verbose_name = "Account"
        verbose_name_plural = "Accounts"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._original_balance = self.balance if self.pk else None

    @property
    def balance(self):
        try:
            Wallet = apps.get_model('wallet', 'Wallet')
            Currency = apps.get_model('wallet', 'Currency')
            usd = Currency.objects.get(code='USD')
            wallet = Wallet.objects.get(account=self, wallet_type='main', currency=usd)
            return wallet.balance
        except Exception:
            # Default demo balances
            if self.account_type in ['demo', 'deriv-demo']:
                return Decimal('10000.00')
            if self.account_type == 'mt5-demo':
                return Decimal('100000.00')
            return Decimal('0.00')

    @balance.setter
    def balance(self, value):
        if value is None:
            return
        try:
            Wallet = apps.get_model('wallet', 'Wallet')
            Currency = apps.get_model('wallet', 'Currency')
            usd = Currency.objects.get_or_create(
                code='USD', defaults={'name': 'US Dollar', 'symbol': '$'}
            )[0]

            wallet, created = Wallet.objects.get_or_create(
                account=self,
                wallet_type='main',
                currency=usd,
                defaults={'balance': Decimal(value)}
            )
            if not created:
                wallet.balance = Decimal(value)
                wallet.save(update_fields=['balance'])
        except Exception as e:
            print(f"[Account.balance setter] Error: {e}")

    def save(self, *args, **kwargs):
        is_new = not self.pk
        super().save(*args, **kwargs)
        
        if is_new:
            if self.account_type == 'mt5-demo':
                initial = Decimal('100000.00')
            elif self.account_type in ['demo', 'deriv-demo']:
                initial = Decimal('10000.00')
            else:
                initial = Decimal('0.00')
            self.balance = initial

    def reset_demo_balance(self):
        if self.account_type in ['demo', 'mt5-demo', 'deriv-demo']:
            if self.platform == 'mt5':
                self.balance = Decimal('100000.00')
            else:
                self.balance = Decimal('10000.00')

    def __str__(self):
        return f"{self.user.username} - {self.platform} - {self.account_type}"
    
class KYCSubmission(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='kyc_submission')
    
    id_document = models.FileField(
        upload_to='kyc/id/%Y/%m/%d/',
        storage=S3Boto3Storage(),
    )
    selfie = models.FileField(
        upload_to='kyc/selfie/%Y/%m/%d/',
        storage=S3Boto3Storage(),
    )
    proof_of_address = models.FileField(
        upload_to='kyc/address/%Y/%m/%d/',
        storage=S3Boto3Storage(),
        blank=True,
        null=True
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_kyc')
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"KYC - {self.user.username} ({self.status})"