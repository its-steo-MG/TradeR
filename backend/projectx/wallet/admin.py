# wallet/admin.py
from django.contrib import admin
from django.urls import reverse, path
from django.utils.html import format_html
from django.utils import timezone
from django.contrib import messages
from django.http import HttpResponseRedirect
from .models import Currency, ExchangeRate, Wallet, WalletTransaction, MpesaNumber, OTPCode
import logging

logger = logging.getLogger('wallet')

@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'symbol', 'is_fiat', 'is_active')
    list_editable = ('is_active',)

@admin.register(ExchangeRate)
class ExchangeRateAdmin(admin.ModelAdmin):
    list_display = ('base_currency', 'target_currency', 'live_rate', 'admin_withdrawal_rate', 'updated_at')
    list_editable = ('live_rate', 'admin_withdrawal_rate')

@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ('account', 'wallet_type', 'currency', 'balance')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = (
        'ref_link', 'user_link', 'type', 'kes', 'usd',
        'phone', 'status', 'status_colored', 'quick_actions', 'created_at'
    )
    list_filter = ('transaction_type', 'status', 'created_at')
    search_fields = ('reference_id', 'wallet__account__user__username', 'mpesa_phone')
    readonly_fields = (
        'created_at', 'completed_at', 'reference_id', 'checkout_request_id',
        'amount', 'converted_amount', 'currency', 'target_currency',
        'exchange_rate_used', 'mpesa_phone', 'wallet'
    )
    date_hierarchy = 'created_at'
    list_editable = ('status',)
    actions = ['approve_selected', 'fail_selected']

    def has_add_permission(self, request):
        return False

    # --- Display Helpers ---
    def ref_link(self, obj):
        url = reverse("admin:wallet_wallettransaction_change", args=[obj.id])
        return format_html('<a href="{}">{}</a>', url, obj.reference_id)
    ref_link.short_description = "Ref"

    def user_link(self, obj):
        try:
            url = reverse("admin:accounts_user_change", args=[obj.wallet.account.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.wallet.account.user.username)
        except Exception:
            return "-"
    user_link.short_description = "User"

    def type(self, obj):
        return obj.transaction_type.capitalize()
    type.short_description = "Type"

    def kes(self, obj):
        if obj.currency.code == 'KSH':
            return f"{obj.amount} KSH"
        elif obj.target_currency and obj.target_currency.code == 'KSH':
            return f"{obj.converted_amount} KSH"
        return "-"
    kes.short_description = "KES"

    def usd(self, obj):
        if obj.currency.code == 'USD':
            return f"{obj.amount} USD"
        elif obj.target_currency and obj.target_currency.code == 'USD':
            return f"{obj.converted_amount} USD"
        return "-"
    usd.short_description = "USD"

    def phone(self, obj):
        return obj.mpesa_phone or "-"
    phone.short_description = "Phone"

    def status_colored(self, obj):
        colors = {
            'pending': 'orange',
            'completed': 'green',
            'failed': 'red'
        }
        return format_html('<span style="color: {};">{}</span>', colors.get(obj.status, 'black'), obj.status.capitalize())
    status_colored.short_description = "Status"

    def quick_actions(self, obj):
        if obj.status == 'pending':
            return format_html(
                '<a href="{}" class="btn btn-success">Approve</a> &nbsp; '
                '<a href="{}" class="btn btn-danger">Fail</a>',
                reverse("admin:approve_transaction", args=[obj.id]),
                reverse("admin:fail_transaction", args=[obj.id])
            )
        return "-"
    quick_actions.short_description = "Actions"

    # --- Actions ---
    def approve_selected(self, request, queryset):
        updated = 0
        for obj in queryset.filter(status='pending'):
            obj.status = 'completed'
            obj.completed_at = timezone.now()
            obj.save()  # This triggers the signal → balance credited once
            updated += 1
        messages.success(request, f"{updated} transaction(s) approved. Balances updated automatically.")

    approve_selected.short_description = "Approve selected transactions"

    def fail_selected(self, request, queryset):
        updated = 0
        for obj in queryset.filter(status__in=['pending', 'failed']):
            obj.status = 'failed'
            obj.description += " | Manually failed by admin"
            obj.save()
            updated += 1
        messages.success(request, f"{updated} transaction(s) marked as failed.")

    fail_selected.short_description = "Fail selected transactions"

    # --- Custom URLs for Quick Actions ---
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:transaction_id>/approve/',
                self.admin_site.admin_view(self.approve_transaction_view),
                name='approve_transaction'
            ),
            path(
                '<int:transaction_id>/fail/',
                self.admin_site.admin_view(self.fail_transaction_view),
                name='fail_transaction'
            ),
        ]
        return custom_urls + urls

    def approve_transaction_view(self, request, transaction_id):
        obj = self.get_object(request, transaction_id)
        if obj is None:
            return self._get_obj_does_not_exist_redirect(request, self.model._meta, transaction_id)
        if obj.status == 'pending':
            obj.status = 'completed'
            obj.completed_at = timezone.now()
            obj.save()  # Triggers signal → credit once
            messages.success(request, f"Transaction {obj.reference_id} approved and balance credited.")
        return HttpResponseRedirect("../..")

    def fail_transaction_view(self, request, transaction_id):
        obj = self.get_object(request, transaction_id)
        if obj is None:
            return self._get_obj_does_not_exist_redirect(request, self.model._meta, transaction_id)
        obj.status = 'failed'
        obj.description += " | Manually failed by admin"
        obj.save()
        messages.success(request, f"Transaction {obj.reference_id} marked as failed.")
        return HttpResponseRedirect("../..")

    # --- Handle Direct Status Changes via List Editable ---
    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if change and 'status' in form.changed_data:
            if obj.status == 'completed':
                messages.success(request, f"Transaction {obj.reference_id} approved → balance credited automatically.")
            elif obj.status == 'failed':
                obj.description += " | Manually failed by admin"
                obj.save()
                messages.success(request, f"Transaction {obj.reference_id} marked as failed.")