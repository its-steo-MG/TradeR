from django.contrib import admin
from .models import MpesaNotification

@admin.register(MpesaNotification)
class MpesaNotificationAdmin(admin.ModelAdmin):
    list_display = ('caller_id', 'source', 'notification_type', 'user', 'mpesa_user', 'is_read', 'created_at')
    list_filter = ('source', 'notification_type', 'is_read', 'created_at')
    search_fields = ('message', 'user__username', 'mpesa_user__user__username', 'equity_transaction_id')
    readonly_fields = ('message', 'created_at')
    ordering = ('-created_at',)