# mpesa_simulator/admin.py
from django.contrib import admin
from .models import MpesaUser, MpesaTransaction

@admin.register(MpesaUser)
class MpesaUserAdmin(admin.ModelAdmin):
    list_display = ('user', 'real_name', 'phone_number', 'balance')
    list_editable = ('balance',)
    search_fields = ('user__username', 'phone_number')
    readonly_fields = ('user', 'phone_number')


@admin.register(MpesaTransaction)
class MpesaTransactionAdmin(admin.ModelAdmin):
    list_display = (
        'reference',              # FIRST = clickable link (default behaviour)
        'mpesa_id',               # SECOND = editable, no conflict
        'mpesa_user',
        'transaction_type',
        'amount',
        'recipient_name',
        'category',
        'description',
        'id',
        'created_at'
    )
    list_editable = ('mpesa_id',)  # Now safe - not the first field
    # Do NOT add list_display_links at all

    list_filter = ('transaction_type', 'category', 'created_at')
    search_fields = (
        'mpesa_id',
        'reference',
        'mpesa_user__user__username',
        'description',
        'recipient_name',
        'recipient_phone'
    )
    readonly_fields = ('reference', 'created_at', 'id')
    ordering = ('-created_at',)

    fieldsets = (
        ('Identifiers', {
            'fields': ('mpesa_id', 'reference', 'id'),
        }),
        ('Core Transaction', {
            'fields': ('mpesa_user', 'transaction_type', 'amount'),
        }),
        ('Extra Details', {
            'fields': ('recipient_name', 'recipient_phone', 'category', 'description'),
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )