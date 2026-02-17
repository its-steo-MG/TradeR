from django.contrib.auth.models import AbstractUser
from django.db import models
from django.contrib.auth.validators import UnicodeUsernameValidator
from decimal import Decimal
from django.apps import apps
from django.utils import timezone
from django.core.mail import send_mail
import uuid

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
    # New suspension fields
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
        indexes = [models.Index(fields=['referral_code'])]  # Perf tweak

    def generate_referral_code(self):
        code = f"MRK-{uuid.uuid4().hex[:8].upper()}"
        while User.objects.filter(referral_code=code).exists():
            code = f"MRK-{uuid.uuid4().hex[:8].upper()}"
        return code

    def __str__(self):
        return self.username

    def can_create_account(self, account_type):
        existing_accounts = self.accounts.all()
        existing_types = {acc.account_type for acc in existing_accounts}
        if len(existing_accounts) >= 3:
            return False
        if account_type == 'demo' and 'demo' in existing_types:
            return False
        if account_type == 'pro-fx':
            has_standard = 'standard' in existing_types
            return has_standard and 'pro-fx' not in existing_types
        if account_type == 'standard' and 'standard' in existing_types:
            return False
        if account_type != 'standard' and account_type != 'demo' and account_type != 'pro-fx':
            return False
        return True

    # Suspension helpers
    def suspend(self, suspension_type: str, reason: str, duration_days: int = None, suspended_by=None):
        """Suspend account – temporary (with duration) or permanent."""
        if self.is_suspended:
            return  # Already suspended

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

        # Send email
        subject = f"TradeRiser Account {'Temporarily' if suspension_type == 'temporary' else 'Permanently'} Suspended"
        message = (
            f"Your TradeRiser account ({self.email}) has been {suspension_type}ly suspended.\n\n"
            f"Reason: {reason}\n"
            f"{'Until: ' + self.suspended_until.strftime('%Y-%m-%d %H:%M') if self.suspended_until else 'Indefinite – contact support for review.'}\n\n"
            f"Contact support@traderiser.com for questions."
        )
        send_mail(subject, message, 'no-reply@traderiser.com', [self.email], fail_silently=False)

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
            self.save(update_fields=['suspension_history'])

        self.save(update_fields=['is_suspended', 'suspension_type', 'suspension_reason', 'suspended_at', 'suspended_until'])

        # Email
        send_mail(
            "TradeRiser Account Reactivated",
            f"Your TradeRiser account ({self.email}) has been reactivated.",
            'no-reply@traderiser.com', [self.email], fail_silently=False
        )

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

class SuspensionEvidence(models.Model):
    """Evidence for permanent suspensions (e.g., screenshots, logs)"""
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='suspension_evidence')
    evidence_file = models.FileField(upload_to='suspension_evidence/%Y/%m/%d/', blank=True)
    description = models.TextField(blank=True, help_text="Details of violation/evidence")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_evidence')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Evidence for {self.user.username} - {self.status}"

class Account(models.Model):
    ACCOUNT_TYPES = [
        ('standard', 'TradeRiser Standard'),
        ('pro', 'TradeRiser Pro'),
        ('islamic', 'TradeRiser Islamic'),
        ('options', 'TradeRiser Options'),
        ('crypto', 'TradeRiser Crypto'),
        ('demo', 'TradeRiser Demo'),
        ('pro-fx', 'TradeRiser Pro-FX'),  # New account type
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='accounts')
    account_type = models.CharField(max_length=50, choices=ACCOUNT_TYPES)

    class Meta:
        unique_together = ('user', 'account_type')

    @property
    def balance(self):
        """Property to fetch balance from the main USD wallet."""
        try:
            Wallet = apps.get_model('wallet', 'Wallet')
            Currency = apps.get_model('wallet', 'Currency')
            usd = Currency.objects.get(code='USD')
            wallet = Wallet.objects.get(account=self, wallet_type='main', currency=usd)
            return wallet.balance
        except (Currency.DoesNotExist, Wallet.DoesNotExist):
            # Fallback for initial creation
            return Decimal('10000.00') if self.account_type == 'demo' else Decimal('0.00')

    @balance.setter
    def balance(self, value):
        """Setter to update the main USD wallet balance."""
        Wallet = apps.get_model('wallet', 'Wallet')
        Currency = apps.get_model('wallet', 'Currency')
        usd = Currency.objects.get_or_create(code='USD', defaults={'name': 'US Dollar', 'symbol': '$'})[0]
        wallet, created = Wallet.objects.get_or_create(
            account=self, wallet_type='main', currency=usd,
            defaults={'balance': value}
        )
        if not created:
            wallet.balance = value
            wallet.save()

    def save(self, *args, **kwargs):
        is_new = not self.pk
        super().save(*args, **kwargs)
        if is_new:
            # Set initial balance via setter
            initial_balance = Decimal('10000.00') if self.account_type == 'demo' else Decimal('0.00')
            self.balance = initial_balance

    def reset_demo_balance(self):
        if self.account_type == 'demo':
            self.balance = Decimal('10000.00')

    def __str__(self):
        return f"{self.user.username} - {self.account_type}"