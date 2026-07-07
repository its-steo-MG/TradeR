from django.contrib.auth.models import AbstractUser
from django.db import models
from django.contrib.auth.validators import UnicodeUsernameValidator
from decimal import Decimal
from django.apps import apps
from django.utils import timezone
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

    # KYC Status
    KYC_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    kyc_status = models.CharField(
        max_length=20,
        choices=KYC_STATUS_CHOICES,
        default='pending',
        verbose_name="KYC Status"
    )
    kyc_submitted_at = models.DateTimeField(null=True, blank=True)
    kyc_approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=['referral_code'])]

    def generate_referral_code(self):
        code = f"MRK-{uuid.uuid4().hex[:8].upper()}"
        while User.objects.filter(referral_code=code).exists():
            code = f"MRK-{uuid.uuid4().hex[:8].upper()}"
        return code

    def __str__(self):
        return self.username

    # ====================== ACCOUNT CREATION LOGIC ======================
    def can_create_account(self, account_type: str, platform: str = 'traderiser') -> bool:
        """Check if user can create a specific account type on a platform."""
        existing_accounts = self.accounts.filter(platform=platform)
        existing_types = {acc.account_type for acc in existing_accounts}

        if platform == 'mt5':
            if account_type in ['demo', 'mt5-demo']:
                return 'mt5-demo' not in existing_types
            if account_type == 'mt5':
                return 'mt5' not in existing_types
            return False

        # Traderiser platform logic
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
        """Create the standard 4 accounts for new users."""
        # Delete any stray accounts first (safety net)
        self.accounts.all().delete()

        default_accounts = [
            {'platform': 'traderiser', 'account_type': 'demo'},
            {'platform': 'traderiser', 'account_type': 'standard'},
            {'platform': 'mt5', 'account_type': 'mt5-demo'},   # Fixed
            {'platform': 'mt5', 'account_type': 'mt5'},        # Real MT5
        ]

        created = []
        for data in default_accounts:
            account, created_flag = Account.objects.get_or_create(
                user=self,
                platform=data['platform'],
                account_type=data['account_type']
            )
            if created_flag:
                created.append(f"{data['platform']}-{data['account_type']}")

        logger.info(f"Created default accounts for user {self.username}: {created}")
        return created

    # ====================== SUSPENSION METHODS ======================
    def suspend(self, suspension_type: str, reason: str, duration_days: int = None, suspended_by=None):
        if self.is_suspended:
            return

        self.is_suspended = True
        self.suspension_type = suspension_type
        self.suspension_reason = reason
        self.suspended_at = timezone.now()

        if suspension_type == 'temporary' and duration_days:
            self.suspended_until = self.suspended_at + timezone.timedelta(days=duration_days)

        entry = {
            "date": self.suspended_at.isoformat(),
            "type": suspension_type,
            "reason": reason[:200],
        }
        if suspended_by:
            entry["by"] = suspended_by.username

        self.suspension_history.append(entry)
        self.save(update_fields=[
            'is_suspended', 'suspension_type', 'suspension_reason',
            'suspended_at', 'suspended_until', 'suspension_history'
        ])

        subject = f"TradeRiser Account {'Temporarily' if suspension_type == 'temporary' else 'Permanently'} Suspended"
        html_message = f"""
        <h2>Account Suspension Notice</h2>
        <p>Dear {self.username},</p>
        <p>Your TradeRiser account (<strong>{self.email}</strong>) has been <strong>{suspension_type}ly suspended</strong>.</p>
        <p><strong>Reason:</strong> {reason}</p>
        {'<p><strong>Valid Until:</strong> ' + self.suspended_until.strftime('%B %d, %Y at %H:%M') + '</p>' if self.suspended_until else '<p><strong>Duration:</strong> Indefinite</p>'}
        <p>If you believe this is a mistake, please contact support.</p>
        <p>Best regards,<br>TradeRiser Team</p>
        """
        send_mail(subject=subject, message=html_message, from_email=None, recipient_list=[self.email], html_message=html_message, fail_silently=False)

    def unsuspend(self, unsuspended_by=None):
        if not self.is_suspended:
            return

        self.is_suspended = False
        self.suspension_type = ''
        self.suspension_reason = ''
        self.suspended_at = None
        self.suspended_until = None

        if unsuspended_by:
            self.suspension_history.append({
                "date": timezone.now().isoformat(),
                "type": "unsuspended",
                "by": unsuspended_by.username
            })

        self.save(update_fields=['is_suspended', 'suspension_type', 'suspension_reason', 'suspended_at', 'suspended_until', 'suspension_history'])

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


# ====================== Other Models ======================
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


class KYCSubmission(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='kyc_submission')
    
    id_document = models.FileField(upload_to='kyc/id_documents/%Y/%m/%d/')
    selfie = models.FileField(upload_to='kyc/selfies/%Y/%m/%d/')
    proof_of_address = models.FileField(upload_to='kyc/proof_of_address/%Y/%m/%d/', blank=True, null=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_kyc')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)

    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"KYC Submission - {self.user.username} ({self.status})"


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
        ('demo', 'TradeRiser Demo'),           # Traderiser Demo
        ('pro-fx', 'TradeRiser Pro-FX'),
        ('mt5', 'MT5 Real'),
        ('mt5-demo', 'MT5 Demo'),              # ← NEW: Distinct type
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='accounts')
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES, default='traderiser')
    account_type = models.CharField(max_length=50, choices=ACCOUNT_TYPES)
    
    mt5_login = models.CharField(max_length=50, blank=True, null=True)
    mt5_password = models.CharField(max_length=128, blank=True, null=True)
    mt5_server = models.CharField(max_length=100, blank=True, null=True)

    is_wallet_verified = models.BooleanField(default=True, verbose_name="Wallet Verified")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'platform', 'account_type')
        ordering = ['-created_at']

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
            if self.account_type == 'mt5-demo':
                return Decimal('100000.00')
            if self.account_type == 'demo':
                return Decimal('10000.00')
            return Decimal('0.00')

    @balance.setter
    def balance(self, value):
        if value is None:
            return
        try:
            Wallet = apps.get_model('wallet', 'Wallet')
            Currency = apps.get_model('wallet', 'Currency')
            usd = Currency.objects.get_or_create(code='USD', defaults={'name': 'US Dollar', 'symbol': '$'})[0]
            wallet, created = Wallet.objects.get_or_create(
                account=self, wallet_type='main', currency=usd,
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
                initial_balance = Decimal('100000.00')
            elif self.account_type == 'demo':
                initial_balance = Decimal('10000.00')
            else:
                initial_balance = Decimal('0.00')
            self.balance = initial_balance

    def reset_demo_balance(self):
        if self.account_type in ['demo', 'mt5-demo']:
            self.balance = Decimal('100000.00') if self.platform == 'mt5' else Decimal('10000.00')

    def __str__(self):
        return f"{self.user.username} - {self.platform} - {self.account_type}"