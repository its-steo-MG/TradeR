from django.contrib import admin
from .models import DerivUserAccount


@admin.register(DerivUserAccount)
class DerivUserAccountAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at', 'updated_at', 'is_token_expired')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at', 'access_token', 'refresh_token')

    def is_token_expired(self, obj):
        return obj.is_token_expired()
    is_token_expired.boolean = True
    is_token_expired.short_description = 'Token Expired?'

    # Security: Don't show full tokens in list view
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # You can add more restrictions if needed (e.g., only superusers see tokens)
        return qs

    # Optional: Make token fields collapsible and readonly
    fieldsets = (
        ('User Information', {
            'fields': ('user',)
        }),
        ('Deriv Account', {
            'fields': ('access_token', 'refresh_token', 'expires_at'),
            'classes': ('collapse',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )