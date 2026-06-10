from django.db import models
from django.utils import timezone
from mpesa_simulator.models import MpesaTransaction, MpesaUser

class MpesaNotification(models.Model):
    NOTIFICATION_TYPES = [
        ('received', 'Received Money'),
        ('sent', 'Sent Money'),
    ]

    mpesa_user = models.ForeignKey(MpesaUser, on_delete=models.CASCADE, related_name='notifications')
    mpesa_transaction = models.OneToOneField(
        MpesaTransaction, 
        on_delete=models.CASCADE, 
        related_name='notification',
        null=True, 
        blank=True
    )
    
    notification_type = models.CharField(max_length=10, choices=NOTIFICATION_TYPES)
    message = models.TextField()
    caller_id = models.CharField(max_length=20, default="MPESA")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.caller_id} - {self.notification_type} - {self.mpesa_transaction.mpesa_id if self.mpesa_transaction else 'N/A'}"