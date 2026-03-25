# models.py
from django.db import models
from django.conf import settings
from django.utils import timezone

class DerivUserAccount(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='deriv_account'
    )
    access_token = models.TextField(help_text="OAuth Bearer token")
    refresh_token = models.TextField(null=True, blank=True)  # kept for future compatibility
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def is_token_expired(self):
        return self.expires_at and self.expires_at < timezone.now()

    def __str__(self):
        return f"Deriv account for {self.user.username}"