# management/admin.py
from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from django.core.mail import send_mail
from django.conf import settings
from django.http import HttpResponseRedirect
from django.utils import timezone
from .models import ManagementRequest

@admin.register(ManagementRequest)
class ManagementRequestAdmin(admin.ModelAdmin):
    list_display = (
        'management_id', 'user_link', 'stake', 'target_profit', 'payment_amount',
        'status_colored', 'mpesa_receipt_number', 'days', 'current_pnl', 'action_buttons'
    )
    list_filter = ('status', 'created_at', 'payment_date')
    search_fields = ('management_id', 'user__username', 'mpesa_phone', 'mpesa_receipt_number')
    readonly_fields = (
        'management_id', 'payment_amount', 'merchant_request_id', 'checkout_request_id',
        'mpesa_receipt_number', 'payment_date', 'current_pnl', 'created_at', 'updated_at'
    )

    fieldsets = (
        ('User & Request', {
            'fields': ('user', 'management_id', 'stake', 'target_profit', 'payment_amount', 'mpesa_phone', 'account_type')
        }),
        ('Payment Info', {
            'fields': ('merchant_request_id', 'checkout_request_id', 'mpesa_receipt_number', 'payment_date')
        }),
        ('Credentials', {
            'fields': ('account_email', 'account_password')
        }),
        ('Management Plan', {
            'fields': ('days', 'daily_stake', 'daily_target_profit', 'start_date', 'end_date', 'current_pnl', 'status')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def user_link(self, obj):
        url = reverse("admin:accounts_user_change", args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.username)
    user_link.short_description = "User"

    def status_colored(self, obj):
        colors = {
            'pending_payment': 'orange',
            'payment_verified': 'blue',
            'credentials_pending': 'purple',
            'active': 'green',
            'completed': 'darkgreen',
            'failed': 'red',
        }
        color = colors.get(obj.status, 'black')
        return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, obj.get_status_display())
    status_colored.short_description = "Status"

    def action_buttons(self, obj):
        if obj.status == 'credentials_pending':
            return format_html('<a href="{}" class="button">Start Management</a>',
                              reverse('admin:start_management', args=[obj.id]))
        return "-"
    action_buttons.short_description = "Actions"

    def get_urls(self):
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            path('<int:obj_id>/start/', self.admin_site.admin_view(self.start_management_view),
                 name='start_management'),
        ]
        return custom_urls + urls

    def start_management_view(self, request, obj_id):
        obj = self.get_object(request, obj_id)
        if obj and obj.status == 'credentials_pending' and obj.days:
            obj.status = 'active'
            obj.start_date = timezone.now().date()
            obj.end_date = obj.start_date + timezone.timedelta(days=obj.days)
            obj.save()

            send_mail(
                "Account Management Started",
                f"Hi {obj.user.username},\n\nYour account management has begun!\n"
                f"Account Type: {obj.account_type}\n"
                f"Target Profit: ${obj.target_profit}\n"
                f"Duration: {obj.days} days\n"
                f"Start Date: {obj.start_date}\n"
                f"Expected End Date: {obj.end_date}\n"
                f"Daily Target: ${obj.daily_target_profit}\n"
                f"We'll update you daily on progress.",
                settings.DEFAULT_FROM_EMAIL,
                [obj.user.email],
            )
        return HttpResponseRedirect(reverse('admin:management_managementrequest_change', args=[obj_id]))