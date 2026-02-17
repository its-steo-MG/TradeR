# customercare/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class ChatThread(models.Model):
    """One thread per user (singleton)"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='support_thread')
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    blocked_until = models.DateTimeField(null=True, blank=True)  # For temporary block
    is_permanently_blocked = models.BooleanField(default=False)
    block_reason = models.TextField(blank=True)
    review_requested = models.BooleanField(default=False)
    review_notes = models.TextField(blank=True, help_text="Admin notes on review")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    auto_delete_at = models.DateTimeField(null=True, blank=True)  # 60 days after permanent block

    def __str__(self):
        return f"Support: {self.user.username}"

    def block_temporarily(self, reason="Suspicious activity", hours=24):
        self.is_permanently_blocked = False
        self.blocked_until = timezone.now() + timedelta(hours=hours)
        self.block_reason = reason
        self.save()

    def block_permanently(self, reason="Fraud detected"):
        self.is_permanently_blocked = True
        self.block_reason = reason
        self.auto_delete_at = timezone.now() + timedelta(days=60)
        self.save()

    def unblock(self):
        self.blocked_until = None
        self.is_permanently_blocked = False
        self.block_reason = ""
        self.review_requested = False
        self.auto_delete_at = None
        self.save()

    def is_blocked(self):
        if self.is_permanently_blocked:
            return True
        if self.blocked_until and timezone.now() < self.blocked_until:
            return True
        return False

    def get_block_message(self):
        if self.is_permanently_blocked:
            return {
                "type": "permanent",
                "title": "Account Permanently Blocked",
                "message": self.block_reason or "Your account has been blocked due to policy violation.",
                "can_request_review": not self.review_requested
            }
        elif self.blocked_until:
            remaining = self.blocked_until - timezone.now()
            hours = int(remaining.total_seconds() // 3600)
            return {
                "type": "temporary",
                "title": "Account Temporarily Suspended",
                "message": f"{self.block_reason or 'Your account is under review.'} Access resumes in ~{hours} hours.",
                "can_request_review": False
            }
        return None


class Message(models.Model):
    thread = models.ForeignKey(ChatThread, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    content = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    is_system = models.BooleanField(default=False)  # For welcome, canned responses, etc.

    class Meta:
        ordering = ['sent_at']

    def __str__(self):
        if self.is_system and self.sender is None:
            return f"TradeRiser Support: {self.content[:30]}..."
        return f"{self.sender.username if self.sender else 'System'}: {self.content[:30]}..."