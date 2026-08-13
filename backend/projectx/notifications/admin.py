# notifications/admin.py
from django.contrib import admin
from .models import PushSubscription

@admin.register(PushSubscription)
class PushSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'endpoint_short', 'created_at', 'updated_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'user__email', 'endpoint')
    readonly_fields = ('created_at', 'updated_at')

    def endpoint_short(self, obj):
        return obj.endpoint[:60] + "..." if len(obj.endpoint) > 60 else obj.endpoint
    endpoint_short.short_description = "Endpoint"