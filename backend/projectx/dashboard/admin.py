from django.contrib import admin
from .models import Transaction

class TransactionAdmin(admin.ModelAdmin):
    list_display = ('account', 'account_type', 'amount', 'transaction_type', 'description', 'created_at')
    list_filter = ('transaction_type', 'account__account_type', 'created_at')
    search_fields = ('account__user__username', 'account__user__email', 'description')
    readonly_fields = ('created_at',)
    
    def account_type(self, obj):
        return obj.account.account_type
    account_type.short_description = 'Account Type'

admin.site.register(Transaction, TransactionAdmin)