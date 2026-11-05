# notifications/models.py
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class PushSubscription(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='push_subscriptions')
    endpoint = models.TextField()
    p256dh = models.CharField(max_length=255)
    auth = models.CharField(max_length=255)
    user_agent = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'endpoint')

    def __str__(self):
        return f"{self.user.username} - {self.endpoint[:50]}"


class MpesaNotification(models.Model):
    """
    Same pattern as BinanceNotification.
    Creating a record automatically triggers a system push via signals.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mpesa_notifications')
    title = models.CharField(max_length=120, default="MPESA")
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    push_sent_at = models.DateTimeField(null=True, blank=True)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} → {self.user}"
