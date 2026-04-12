# customercare/admin.py
from django.contrib import admin
from .models import ChatThread, Message,AdminEmail
from django import forms
from django.core.mail import send_mail
from django.conf import settings
from accounts.models import User
import logging

logger = logging.getLogger(__name__)

@admin.register(ChatThread)
class ChatThreadAdmin(admin.ModelAdmin):
    list_display = ['user', 'is_active', 'is_blocked', 'blocked_until', 'is_permanently_blocked', 'review_requested']
    list_filter = ['is_permanently_blocked', 'review_requested']
    search_fields = ['user__username', 'user__email']
    actions = ['block_temp_24h', 'block_permanent', 'unblock_all']

    def block_temp_24h(self, request, queryset):
        for thread in queryset:
            thread.block_temporarily("Admin action: 24h block")
        self.message_user(request, "Selected users blocked for 24 hours.")
    block_temp_24h.short_description = "Block temporarily (24h)"

    def block_permanent(self, request, queryset):
        for thread in queryset:
            thread.block_permanently("Admin action: Fraud")
        self.message_user(request, "Selected users permanently blocked.")
    block_permanent.short_description = "Block permanently"

    def unblock_all(self, request, queryset):
        for thread in queryset:
            thread.unblock()
        self.message_user(request, "Selected users unblocked.")
    unblock_all.short_description = "Unblock selected"

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['thread', 'sender', 'content', 'sent_at', 'is_read']
    list_filter = ['is_system', 'is_read']
    search_fields = ['content', 'sender__username']

from .models import CustomerCareSettings, CallSession

@admin.register(CustomerCareSettings)
class CustomerCareSettingsAdmin(admin.ModelAdmin):
    list_display = ['hold_music', 'welcome_audio']
    fieldsets = [
        ("Hold Music & Welcome", {'fields': ['hold_music', 'welcome_audio', 'welcome_text']}),
    ]


@admin.register(CallSession)
class CallSessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'status', 'started_at', 'agent', 'voice_preset', 'is_missed']
    list_filter = ['status', 'voice_preset', 'is_missed']
    search_fields = ['user__username']

@admin.register(AdminEmail)
class AdminEmailAdmin(admin.ModelAdmin):
    list_display = ['subject', 'recipient_type', 'target_user', 'sent_by', 'sent_at']
    list_filter = ['recipient_type', 'sent_at']
    search_fields = ['subject', 'message', 'target_user__username', 'sent_by__username']
    
    readonly_fields = ['sent_by', 'sent_at']
    exclude = ['sent_by']   # Hide sent_by from form

    # Professional Beautiful Email Template
    def send_professional_email(self, obj):
        if not obj.message:
            return

        plain_message = obj.message

        # Beautiful HTML version
        html_message = f"""
        <html>
        <head>
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f9f9f9; }}
                .container {{ max-width: 650px; margin: 20px auto; padding: 30px; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }}
                .header {{ 
                    color: #0066cc; 
                    font-size: 28px; 
                    margin-bottom: 20px; 
                    text-align: center; 
                }}
                .content {{ 
                    font-size: 16px; 
                    margin-bottom: 25px; 
                    line-height: 1.7;
                }}
                .footer {{ 
                    font-size: 13px; 
                    color: #777777; 
                    text-align: center; 
                    margin-top: 30px; 
                    border-top: 1px solid #eee; 
                    padding-top: 15px; 
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1 class="header">TradeRiser Official Announcement</h1>
                <div class="content">
                    {obj.html_message or obj.message.replace('\n', '<br>')}
                </div>
                <div class="footer">
                    Best regards,<br>
                    <strong>TradeRiser Trading Team</strong><br>
                    <a href="{settings.FRONTEND_URL}" style="color: #0066cc;">{settings.FRONTEND_URL}</a>
                </div>
            </div>
        </body>
        </html>
        """

        try:
            if obj.recipient_type == 'single' and obj.target_user and obj.target_user.email:
                recipient_list = [obj.target_user.email]
            else:
                # Broadcast to all active users
                recipient_list = list(
                    User.objects.filter(is_active=True)
                    .exclude(email='')
                    .values_list('email', flat=True)
                )

            if not recipient_list:
                logger.warning("No recipients found for admin email")
                return

            send_mail(
                subject=obj.subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=recipient_list,
                html_message=html_message,
                fail_silently=False,   # Set to True in production if you prefer
            )

            logger.info(f"✅ Professional admin email sent | Type: {obj.recipient_type} | Subject: {obj.subject} | Recipients: {len(recipient_list)}")

        except Exception as e:
            logger.error(f"❌ Failed to send admin email: {str(e)}", exc_info=True)

    # Automatically set sent_by and send email when saved from admin
    def save_model(self, request, obj, form, change):
        if not change:  # Only when creating a new email
            obj.sent_by = request.user
            super().save_model(request, obj, form, change)
            self.send_professional_email(obj)   # Send the email
        else:
            super().save_model(request, obj, form, change)

    # Optional: Hide target_user field when recipient_type is 'all'
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        
        # Hide sent_by completely
        if 'sent_by' in form.base_fields:
            form.base_fields['sent_by'].widget = forms.HiddenInput()
        
        return form