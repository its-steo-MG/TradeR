from django.contrib import admin
from django.db import transaction
from django.contrib import messages
from decimal import Decimal
from .models import EquityAccount, EquityTransaction, EquityNotification


@admin.register(EquityAccount)
class EquityAccountAdmin(admin.ModelAdmin):
    list_display = ('account_name', 'user', 'account_number', 'balance', 'currency', 'is_primary', 'is_active')
    list_filter = ('account_type', 'is_active', 'is_primary')
    search_fields = ('account_name', 'account_number', 'user__username', 'user__email')
    readonly_fields = ('account_number', 'created_at', 'updated_at')
    actions = ['add_balance', 'subtract_balance']

    def add_balance(self, request, queryset):
        # Simple form-based action – in real admin you can use intermediate page
        # For now we use a fixed amount example; you can enhance with a form later
        amount = Decimal('1000.00')   # change or make dynamic
        for account in queryset:
            with transaction.atomic():
                account.balance += amount
                account.save(update_fields=['balance'])
                EquityTransaction.objects.create(
                    account=account,
                    amount=amount,
                    transaction_type='admin_adjustment',
                    description=f"Admin credit of {amount} KES",
                    balance_after=account.balance
                )
        self.message_user(request, f"Added {amount} KES to selected accounts.", messages.SUCCESS)
    add_balance.short_description = "Add 1000 KES (demo)"

    def subtract_balance(self, request, queryset):
        amount = Decimal('500.00')
        for account in queryset:
            if account.balance >= amount:
                with transaction.atomic():
                    account.balance -= amount
                    account.save(update_fields=['balance'])
                    EquityTransaction.objects.create(
                        account=account,
                        amount=-amount,
                        transaction_type='admin_adjustment',
                        description=f"Admin debit of {amount} KES",
                        balance_after=account.balance
                    )
        self.message_user(request, f"Subtracted {amount} KES from selected accounts.", messages.SUCCESS)
    subtract_balance.short_description = "Subtract 500 KES (demo)"


@admin.register(EquityTransaction)
class EquityTransactionAdmin(admin.ModelAdmin):
    list_display = ('reference', 'account', 'amount', 'transaction_type', 'description', 'created_at')
    list_filter = ('transaction_type',)
    search_fields = ('reference', 'description', 'account__account_number')
    readonly_fields = ('reference', 'created_at')


@admin.register(EquityNotification)
class EquityNotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'is_read', 'created_at')
    list_filter = ('is_read',)
    search_fields = ('title', 'body', 'user__username')