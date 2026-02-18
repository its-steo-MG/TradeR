# traderpulse/models.py
from django.db import models
from django.contrib.auth import get_user_model
from accounts.models import Account
import uuid

User = get_user_model()

class FakeTrader(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50)
    username = models.CharField(max_length=40, unique=True)
    country = models.CharField(max_length=50, blank=True)
    country_flag = models.CharField(max_length=10, default="🌍")
    avatar_url = models.URLField(blank=True, null=True)
    bio = models.CharField(max_length=160, blank=True)
    profit_fake = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    is_premium = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"@{self.username} ({self.country_flag})"


class FeedItem(models.Model):
    CONTENT_TYPES = [
        ('text', 'Text Only'),
        ('image', 'Image + Caption'),
        ('video', 'Video'),
        ('chart', 'Chart Analysis'),
        ('win', 'Big Win Celebration'),
        ('loss', 'Reality Check'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Can be real user OR fake trader
    real_user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='feed_posts')
    fake_trader = models.ForeignKey(FakeTrader, null=True, blank=True, on_delete=models.CASCADE)

    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES, default='text')
    text = models.TextField()
    image = models.URLField(blank=True, null=True)
    video = models.URLField(blank=True, null=True)
    
    likes = models.IntegerField(default=0)
    is_ai_generated = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['is_ai_generated']),
        ]

    def __str__(self):
        sender = self.real_user.username if self.real_user else f"@{self.fake_trader.username}"
        return f"{sender}: {self.text[:50]}"