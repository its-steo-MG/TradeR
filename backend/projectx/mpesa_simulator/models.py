# mpesa_simulator/models.py
from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from decimal import Decimal
from accounts.models import User
from wallet.models import MpesaNumber
from django.utils import timezone
import random
import string
import pytz   # ← Added for consistent EAT timezone


class MpesaUser(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='mpesa_user')
    real_name = models.CharField(max_length=100)
    pin = models.CharField(max_length=128)  # Hashed 4-digit PIN
    phone_number = models.CharField(max_length=15)
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    profile_photo = models.ImageField(
        upload_to='mpesa_avatars/%Y/%m/%d/',
        blank=True,
        null=True
    )
    fuliza = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))

    # === Daily Transaction Limit ===
    daily_sent_total = models.DecimalField(
        max_digits=14, 
        decimal_places=2, 
        default=Decimal('0.00')
    )
    daily_limit_reset_at = models.DateTimeField(null=True, blank=True)

    def set_pin(self, raw_pin):
        self.pin = make_password(raw_pin)

    def check_pin(self, raw_pin):
        return check_password(raw_pin, self.pin)

    def reset_daily_limit_if_needed(self):
        if not self.daily_limit_reset_at:
            self.daily_limit_reset_at = timezone.now()
            self.daily_sent_total = Decimal('0.00')
            return True

        if timezone.now() > self.daily_limit_reset_at + timezone.timedelta(hours=24):
            self.daily_sent_total = Decimal('0.00')
            self.daily_limit_reset_at = timezone.now()
            return True
        return False

    def get_remaining_daily_limit(self):
        self.reset_daily_limit_if_needed()
        daily_limit = Decimal('500000.00')
        remaining = daily_limit - self.daily_sent_total
        return max(remaining, Decimal('0.00'))

    def record_daily_withdrawal(self, amount):
        self.reset_daily_limit_if_needed()
        self.daily_sent_total += amount
        self.save(update_fields=['daily_sent_total', 'daily_limit_reset_at'])

    def save(self, *args, **kwargs):
        if not self.phone_number:
            try:
                mpesa_num = MpesaNumber.objects.get(user=self.user)
                self.phone_number = mpesa_num.phone_number
            except MpesaNumber.DoesNotExist:
                self.phone_number = self.user.phone or ''
        
        if not self.daily_limit_reset_at:
            self.daily_limit_reset_at = timezone.now()
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"M-Pesa for {self.user.username} ({self.phone_number})"


class MpesaTransaction(models.Model):
    TRANSACTION_TYPES = [
        ('deposit', 'Deposit'),
        ('withdrawal', 'Withdrawal'),
        ('transfer', 'Transfer'),
    ]
    CATEGORY_CHOICES = [
        ('family_friends', 'Family and Friends'),
        ('business', 'Business'),
        ('other', 'Other'),
    ]

    mpesa_user = models.ForeignKey(MpesaUser, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    description = models.TextField(blank=True)
    reference = models.CharField(max_length=50, blank=True, null=True)
    mpesa_id = models.CharField(max_length=50, blank=True, null=True, unique=True)
    recipient_name = models.CharField(max_length=100, blank=True)
    recipient_phone = models.CharField(max_length=15, blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def generate_mpesa_id(self, reference_id: str = None):
        """Generate M-Pesa ID - MUST MATCH FRONTEND EXACTLY using EAT timezone"""
        createdDate = self.created_at or timezone.now()

        # === CRITICAL: Convert to East Africa Time (EAT) ===
        local_tz = pytz.timezone('Africa/Nairobi')
        local_date = timezone.localtime(createdDate, local_tz)

        # Year letter: A=2006, B=2007, ..., U=2026, ...
        yearOffset = local_date.year - 2005
        yearChar = chr(64 + yearOffset) if 1 <= yearOffset <= 26 else "Z"

        # Month letter: A=Jan, B=Feb, ..., L=Dec
        monthChar = chr(64 + local_date.month)

        # Day character - Must match frontend TypeScript exactly
        dayNum = local_date.day
        if 1 <= dayNum <= 9:
            dayChar = str(dayNum)
        elif 10 <= dayNum <= 31:
            dayChar = chr(64 + dayNum - 9)   # 10=A, 11=B, ..., 31=V
        else:
            dayChar = "A"

        datePrefix = yearChar + monthChar + dayChar

        # Deterministic suffix - Match frontend hashing
        seed = reference_id or self.reference or str(self.pk) or "default"
        hash_val = 0
        for char in seed:
            hash_val = (hash_val * 31 + ord(char)) & 0xFFFFFFFF

        chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        suffix = ""
        for i in range(7):
            hash_val = (hash_val * 31 + i) & 0xFFFFFFFF
            suffix += chars[hash_val % len(chars)]

        return datePrefix + suffix

    def save(self, *args, **kwargs):
        if not self.reference:
            prefix = random.choice(string.ascii_uppercase)
            suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=9))
            self.reference = prefix + suffix

        if not self.mpesa_id:
            ref_for_id = getattr(self, '_wallet_reference_id', self.reference or str(self.pk))
            self.mpesa_id = self.generate_mpesa_id(reference_id=ref_for_id)

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.transaction_type.capitalize()} - {self.amount} KSH for {self.mpesa_user.user.username}"
    
    