# mpesa_simulator/models.py
from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from decimal import Decimal
from accounts.models import User  # Link to TradeRiser User
from wallet.models import MpesaNumber  # For phone if available
from django.utils import timezone
import random
import string

class MpesaUser(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='mpesa_user')
    real_name = models.CharField(max_length=100)
    pin = models.CharField(max_length=128)  # Hashed 4-digit PIN
    phone_number = models.CharField(max_length=15)  # Synced from wallet or user
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))  # KSH
    profile_photo = models.ImageField(
        upload_to='mpesa_avatars/%Y/%m/%d/',
        blank=True,
        null=True
    )
    fuliza = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))

    def set_pin(self, raw_pin):
        self.pin = make_password(raw_pin)

    def check_pin(self, raw_pin):
        return check_password(raw_pin, self.pin)

    def save(self, *args, **kwargs):
        if not self.phone_number:
            try:
                mpesa_num = MpesaNumber.objects.get(user=self.user)
                self.phone_number = mpesa_num.phone_number
            except MpesaNumber.DoesNotExist:
                self.phone_number = self.user.phone or ''
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
    description = models.TextField(blank=True)
    reference = models.CharField(max_length=50, blank=True, null=True)  # Removed unique=True to allow same reference for all synced txns
    mpesa_id = models.CharField(max_length=50, blank=True, null=True, unique=True)  # Unique M-Pesa style ID
    recipient_name = models.CharField(max_length=100, blank=True)
    recipient_phone = models.CharField(max_length=15, blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.reference:
            prefix = random.choice(string.ascii_uppercase)
            suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=9))
            self.reference = prefix + suffix

        if not self.mpesa_id:
            now = timezone.now()  # Use transaction creation time (timezone-aware)

            # Year encoding: A=2006, B=2007, ..., Z=2031
            year_offset = now.year - 2005
            if 1 <= year_offset <= 26:
                year_char = chr(ord('A') + year_offset - 1)
            else:
                year_char = 'Z'  # fallback for far future years

            # Month: A=Jan (1), B=Feb (2), ..., L=Dec (12)
            month_char = chr(ord('A') + now.month - 1)

            # Day: 1-9 → '1'-'9', 10-31 → 'A' to 'V'
            day_num = now.day
            if 1 <= day_num <= 9:
                day_char = str(day_num)
            elif 10 <= day_num <= 31:
                day_char = chr(ord('A') + day_num - 10)
            else:
                day_char = 'A'  # fallback (should never happen)

            date_prefix = year_char + month_char + day_char

            # Generate 7-char random alphanumeric suffix (uppercase)
            suffix_chars = string.ascii_uppercase + string.digits
            suffix = ''.join(random.choices(suffix_chars, k=7))

            candidate = date_prefix + suffix

            # Ensure uniqueness (extremely rare collision, but safe)
            while MpesaTransaction.objects.filter(mpesa_id=candidate).exists():
                suffix = ''.join(random.choices(suffix_chars, k=7))
                candidate = date_prefix + suffix

            self.mpesa_id = candidate

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.transaction_type.capitalize()} - {self.amount} KSH for {self.mpesa_user.user.username}"