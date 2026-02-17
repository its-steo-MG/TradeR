# customercare/admin.py
from django.contrib import admin
from .models import ChatThread, Message

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