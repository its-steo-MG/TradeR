# notifications/admin.py
from django.contrib import admin
from .models import PushSubscription, MpesaNotification


@admin.register(PushSubscription)
class PushSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'endpoint_short', 'created_at', 'updated_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'user__email', 'endpoint')
    readonly_fields = ('created_at', 'updated_at')

    def endpoint_short(self, obj):
        return obj.endpoint[:60] + "..." if len(obj.endpoint) > 60 else obj.endpoint
    endpoint_short.short_description = "Endpoint"


@admin.register(MpesaNotification)
class MpesaNotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'is_read', 'push_sent_at', 'created_at')
    list_filter = ('is_read', 'created_at')
    search_fields = ('title', 'body', 'user__username')
    readonly_fields = ('created_at', 'push_sent_at')
