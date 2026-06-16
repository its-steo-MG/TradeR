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
    search_fields = ('code', 'name')
    list_filter = ('is_fiat', 'is_active')


@admin.register(ExchangeRate)
class ExchangeRateAdmin(admin.ModelAdmin):
    list_display = ('base_currency', 'target_currency', 'live_rate', 'admin_withdrawal_rate', 'updated_at')
    list_editable = ('live_rate', 'admin_withdrawal_rate')
    list_filter = ('base_currency', 'target_currency')
    search_fields = ('base_currency__code', 'target_currency__code')


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ('user_link', 'wallet_type', 'currency', 'balance', 'created_at')
    list_filter = ('wallet_type', 'currency', 'created_at')
    search_fields = (
        'account__user__username',
        'account__user__email',
        'account__user__first_name',
        'account__user__last_name',
        'account__account_type',
    )
    
    readonly_fields = ('created_at', 'updated_at')
    fields = ('account', 'wallet_type', 'currency', 'balance', 'created_at', 'updated_at')
    list_editable = ('balance',)
    ordering = ('-created_at',)

    def user_link(self, obj):
        try:
            url = reverse("admin:accounts_user_change", args=[obj.account.user.id])
            return format_html(
                '<a href="{}">{} ({})</a>', 
                url, 
                obj.account.user.username,
                obj.account.account_type
            )
        except Exception:
            return "-"
    user_link.short_description = "User"
    user_link.admin_order_field = 'account__user__username'

    def save_model(self, request, obj, form, change):
        if change and 'balance' in form.changed_data:
            messages.warning(
                request, 
                f"⚠️ Balance manually changed for {obj.account.user.username}'s "
                f"{obj.wallet_type} {obj.currency} wallet."
            )
        super().save_model(request, obj, form, change)


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = (
        'ref_link', 
        'user_link', 
        'is_marketo_flag',
        'type', 
        'kes', 
        'usd',
        'phone', 
        'status', 
        'status_colored', 
        'quick_actions', 
        'created_at'
    )
    list_filter = (
        'transaction_type', 
        'status', 
        'created_at', 
        'currency',
        'wallet__account__user__is_marketo'
    )
    search_fields = (
        'reference_id',
        'wallet__account__user__username',
        'wallet__account__user__email',
        'mpesa_phone',
        'description',
        'checkout_request_id',
    )
    
    readonly_fields = (
        'created_at', 'completed_at', 'reference_id', 'checkout_request_id',
        'amount', 'converted_amount', 'currency', 'target_currency',
        'exchange_rate_used', 'mpesa_phone', 'wallet'
    )
    
    date_hierarchy = 'created_at'
    list_editable = ('status',)
    actions = ['approve_selected', 'fail_selected']
    ordering = ('-created_at',)

    def has_add_permission(self, request):
        return False

    # ====================== DISPLAY HELPERS ======================
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

    def is_marketo_flag(self, obj):
        """Show if user is Marketo"""
        try:
            if getattr(obj.wallet.account.user, 'is_marketo', False):
                return format_html('<span style="color: purple; font-weight: bold;">✅ Marketo</span>')
        except:
            pass
        return format_html('<span style="color: gray;">—</span>')
    is_marketo_flag.short_description = "Marketo"

    def type(self, obj):
        return obj.get_transaction_type_display() or obj.transaction_type.capitalize()
    type.short_description = "Type"

    def kes(self, obj):
        if getattr(obj.currency, 'code', None) == 'KSH':
            return f"{obj.amount} KSH"
        elif getattr(obj.target_currency, 'code', None) == 'KSH':
            return f"{obj.converted_amount} KSH"
        return "-"
    kes.short_description = "KES"

    def usd(self, obj):
        if getattr(obj.currency, 'code', None) == 'USD':
            return f"{obj.amount} USD"
        elif getattr(obj.target_currency, 'code', None) == 'USD':
            return f"{obj.converted_amount} USD"
        return "-"
    usd.short_description = "USD"

    def phone(self, obj):
        return obj.mpesa_phone or "-"
    phone.short_description = "Phone"

    def status_colored(self, obj):
        try:
            if obj.status == 'pending' and getattr(obj.wallet.account.user, 'is_marketo', False):
                # Special message for the new Marketo transfer funding flow
                if obj.transaction_type == 'transfer_out':
                    return format_html(
                        '<span style="color: #6b21a8; font-weight: bold;">Pending Admin Approval (Marketo Funded)</span>'
                    )
                return format_html(
                    '<span style="color: purple; font-weight: bold;">Pending (Auto in 5s)</span>'
                )
        except:
            pass

        colors = {'pending': 'orange', 'completed': 'green', 'failed': 'red'}
        return format_html(
            '<span style="color: {};">{}</span>', 
            colors.get(obj.status, 'black'), 
            obj.status.capitalize()
        )
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

    # ====================== ACTIONS ======================
    def approve_selected(self, request, queryset):
        updated = 0
        for obj in queryset.filter(status='pending'):
            obj.status = 'completed'
            obj.completed_at = timezone.now()
            obj.save()
            updated += 1

            # Auto-complete paired transfer_in when approving transfer_out (for Marketo funding flow)
            if obj.transaction_type == 'transfer_out':
                try:
                    paired = WalletTransaction.objects.get(
                        reference_id=obj.reference_id,
                        transaction_type='transfer_in',
                        status='pending'
                    )
                    paired.status = 'completed'
                    paired.completed_at = timezone.now()
                    paired.description = (paired.description or '') + " | Auto-completed with outgoing side (admin bulk approve)"
                    paired.save()
                except WalletTransaction.DoesNotExist:
                    pass

        messages.success(request, f"{updated} transaction(s) approved.")
    approve_selected.short_description = "Approve selected transactions"

    def fail_selected(self, request, queryset):
        updated = 0
        for obj in queryset.filter(status__in=['pending', 'failed']):
            obj.status = 'failed'
            if not obj.description:
                obj.description = ""
            obj.description += " | Manually failed by admin"
            obj.save()
            updated += 1
        messages.success(request, f"{updated} transaction(s) marked as failed.")
    fail_selected.short_description = "Fail selected transactions"

    # ====================== CUSTOM URLS ======================
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('<int:transaction_id>/approve/', 
                 self.admin_site.admin_view(self.approve_transaction_view), 
                 name='approve_transaction'),
            path('<int:transaction_id>/fail/', 
                 self.admin_site.admin_view(self.fail_transaction_view), 
                 name='fail_transaction'),
        ]
        return custom_urls + urls

    def approve_transaction_view(self, request, transaction_id):
        obj = self.get_object(request, transaction_id)
        if obj and obj.status == 'pending':
            obj.status = 'completed'
            obj.completed_at = timezone.now()
            obj.save()

            # === NEW: Auto-complete the paired transfer_in for Marketo transfer funding flow ===
            if obj.transaction_type == 'transfer_out':
                try:
                    paired = WalletTransaction.objects.get(
                        reference_id=obj.reference_id,
                        transaction_type='transfer_in',
                        status__in=['pending', 'failed']  # allow recovering failed ones too
                    )
                    paired.status = 'completed'
                    paired.completed_at = timezone.now()
                    paired.description = (paired.description or '') + " | Auto-completed when outgoing side was approved"
                    paired.save()
                    messages.success(request, f"Transaction {obj.reference_id} approved (paired incoming transfer also completed).")
                except WalletTransaction.DoesNotExist:
                    messages.success(request, f"Transaction {obj.reference_id} approved.")
            else:
                messages.success(request, f"Transaction {obj.reference_id} approved.")

        return HttpResponseRedirect("../..")

    def fail_transaction_view(self, request, transaction_id):
        obj = self.get_object(request, transaction_id)
        if obj:
            obj.status = 'failed'
            if not obj.description:
                obj.description = ""
            obj.description += " | Manually failed by admin"
            obj.save()

            # Also fail the paired side if it's a transfer
            if obj.transaction_type == 'transfer_out':
                try:
                    paired = WalletTransaction.objects.get(
                        reference_id=obj.reference_id,
                        transaction_type='transfer_in'
                    )
                    if paired.status != 'failed':
                        paired.status = 'failed'
                        paired.description = (paired.description or '') + " | Failed together with outgoing side"
                        paired.save()
                except WalletTransaction.DoesNotExist:
                    pass

            messages.success(request, f"Transaction {obj.reference_id} marked as failed.")
        return HttpResponseRedirect("../..")


@admin.register(MpesaNumber)
class MpesaNumberAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone_number', 'is_verified', 'created_at')
    search_fields = ('user__username', 'user__email', 'phone_number')
    list_filter = ('is_verified', 'created_at')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(OTPCode)
class OTPCodeAdmin(admin.ModelAdmin):
    list_display = ('user', 'code', 'purpose', 'is_used', 'created_at', 'expires_at')
    list_filter = ('purpose', 'is_used', 'created_at')
    search_fields = ('user__username', 'user__email', 'code')
    readonly_fields = ('created_at', 'expires_at')