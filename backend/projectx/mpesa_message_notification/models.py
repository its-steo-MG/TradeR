from django.db import models
from django.utils import timezone
from mpesa_simulator.models import MpesaTransaction, MpesaUser
from django.contrib.auth import get_user_model

User = get_user_model()


class MpesaNotification(models.Model):
    NOTIFICATION_TYPES = [
        ('received', 'Received Money'),
        ('sent', 'Sent Money'),
    ]

    SOURCE_CHOICES = [
        ('mpesa', 'M-Pesa'),
        ('equity', 'Equity Bank'),
    ]

    # Existing M-Pesa fields (kept for backward compatibility)
    mpesa_user = models.ForeignKey(
        MpesaUser, 
        on_delete=models.CASCADE, 
        related_name='notifications',
        null=True, 
        blank=True
    )
    mpesa_transaction = models.OneToOneField(
        MpesaTransaction, 
        on_delete=models.CASCADE, 
        related_name='notification',
        null=True, 
        blank=True
    )

    # New fields for Equity
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='equity_messages',
        null=True, 
        blank=True
    )
    equity_transaction_id = models.CharField(max_length=50, blank=True, null=True)
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES, default='mpesa')

    notification_type = models.CharField(max_length=10, choices=NOTIFICATION_TYPES)
    message = models.TextField()
    caller_id = models.CharField(max_length=30, default="MPESA")   # Will be "Equity Bank" for Equity
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.caller_id} - {self.notification_type} - {self.created_at}"