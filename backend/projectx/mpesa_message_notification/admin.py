from django.contrib import admin
from .models import MpesaNotification

@admin.register(MpesaNotification)
class MpesaNotificationAdmin(admin.ModelAdmin):
    list_display = ('mpesa_user', 'notification_type', 'caller_id', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('message', 'mpesa_user__user__username', 'mpesa_transaction__mpesa_id')
    readonly_fields = ('message', 'created_at')
    ordering = ('-created_at',)