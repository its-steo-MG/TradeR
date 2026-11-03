from django.contrib import admin
from django.db import transaction
from django.contrib import messages
from decimal import Decimal
from .models import BinanceWallet, BinanceTransaction, BinanceNotification


@admin.register(BinanceWallet)
class BinanceWalletAdmin(admin.ModelAdmin):
    list_display = ('label', 'user', 'address', 'uid', 'balance', 'currency', 'verification_status', 'account_tier', 'is_primary', 'is_active')
    list_filter = ('network', 'is_active', 'is_primary', 'currency', 'verification_status', 'account_tier')
    search_fields = ('label', 'address', 'uid', 'user__username', 'user__email')
    readonly_fields = ('address', 'uid', 'created_at', 'updated_at')
    list_editable = ('verification_status', 'account_tier')
    actions = ['add_balance', 'subtract_balance', 'mark_verified', 'mark_unverified']

    def add_balance(self, request, queryset):
        amount = Decimal('100.00')
        for wallet in queryset:
            with transaction.atomic():
                wallet.balance += amount
                wallet.save(update_fields=['balance'])
                BinanceTransaction.objects.create(
                    wallet=wallet,
                    amount=amount,
                    transaction_type='admin_adjustment',
                    description=f"Admin credit of {amount} {wallet.currency}",
                    balance_after=wallet.balance
                )
        self.message_user(request, f"Added {amount} USDT to selected wallets.", messages.SUCCESS)
    add_balance.short_description = "Add 100 USDT (demo)"

    def subtract_balance(self, request, queryset):
        amount = Decimal('50.00')
        for wallet in queryset:
            if wallet.balance >= amount:
                with transaction.atomic():
                    wallet.balance -= amount
                    wallet.save(update_fields=['balance'])
                    BinanceTransaction.objects.create(
                        wallet=wallet,
                        amount=-amount,
                        transaction_type='admin_adjustment',
                        description=f"Admin debit of {amount} {wallet.currency}",
                        balance_after=wallet.balance
                    )
        self.message_user(request, f"Subtracted {amount} USDT from selected wallets.", messages.SUCCESS)
    subtract_balance.short_description = "Subtract 50 USDT (demo)"

    def mark_verified(self, request, queryset):
        updated = queryset.update(verification_status='verified')
        self.message_user(request, f"Marked {updated} wallet(s) as Verified.", messages.SUCCESS)
    mark_verified.short_description = "Mark as Verified"

    def mark_unverified(self, request, queryset):
        updated = queryset.update(verification_status='unverified')
        self.message_user(request, f"Marked {updated} wallet(s) as Unverified.", messages.SUCCESS)
    mark_unverified.short_description = "Mark as Unverified"


@admin.register(BinanceTransaction)
class BinanceTransactionAdmin(admin.ModelAdmin):
    list_display = ('reference', 'wallet', 'amount', 'transaction_type', 'description', 'created_at')
    list_filter = ('transaction_type',)
    search_fields = ('reference', 'description', 'wallet__address')
    readonly_fields = ('reference', 'created_at')


@admin.register(BinanceNotification)
class BinanceNotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'is_read', 'created_at')
    list_filter = ('is_read',)
    search_fields = ('title', 'body', 'user__username')
