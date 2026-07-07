# admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django import forms
from django.urls import reverse
from django.utils.html import format_html

from .models import User, Account, SuspensionEvidence
from dashboard.models import Transaction


# ====================== Forms ======================
class AccountForm(forms.ModelForm):
    balance = forms.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        help_text="Edit this to update the main USD wallet balance"
    )

    class Meta:
        model = Account
        fields = ['account_type', 'balance', 'is_wallet_verified']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            self.fields['balance'].initial = self.instance.balance


# ====================== Inline for User Admin ======================
class AccountInline(admin.TabularInline):
    model = Account
    extra = 0
    form = AccountForm
    fields = ('account_type', 'balance', 'is_wallet_verified')

    def save_formset(self, request, form, formset, change):
        """Important: Handle balance updates in inline forms"""
        instances = formset.save(commit=False)
        for form_obj in formset.forms:
            if form_obj.has_changed() and 'balance' in form_obj.changed_data:
                new_balance = form_obj.cleaned_data.get('balance')
                if new_balance is not None:
                    instance = form_obj.instance
                    instance.balance = new_balance  # Trigger setter
        formset.save_m2m()


# ====================== Suspension Evidence Inline ======================
class SuspensionEvidenceInline(admin.TabularInline):
    model = SuspensionEvidence
    extra = 0
    fields = ('evidence_file', 'description', 'status', 'reviewed_by', 'reviewed_at')
    fk_name = 'user'
    readonly_fields = ('status', 'reviewed_by', 'reviewed_at')
    can_delete = True
    show_change_link = True


# ====================== Account Admin (Standalone) ======================
class AccountAdmin(admin.ModelAdmin):
    form = AccountForm
    
    list_display = ('user_username', 'account_type', 'balance', 'is_wallet_verified', 'id')
    list_filter = ('account_type', 'is_wallet_verified')
    list_editable = ('is_wallet_verified',)
    
    search_fields = ('user__username', 'user__email', 'user__phone')
    autocomplete_fields = ['user']

    def user_username(self, obj):
        if obj.user:
            url = reverse('admin:accounts_user_change', args=[obj.user.pk])
            return format_html('<a href="{}">{}</a>', url, obj.user.username)
        return "—"
    
    user_username.short_description = 'Username'
    user_username.admin_order_field = 'user__username'

    def save_model(self, request, obj, form, change):
        """Handle balance update on standalone Account page"""
        if change and 'balance' in form.changed_data:
            new_balance = form.cleaned_data.get('balance')
            if new_balance is not None:
                obj.balance = new_balance   # This calls the property setter

        super().save_model(request, obj, form, change)


# ====================== Custom User Admin ======================
class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ('username', 'email', 'phone', 'is_sashi', 'is_email_verified', 
                    'referral_code', 'is_active', 'is_suspended', 'suspension_type')
    list_filter = ('is_sashi', 'is_email_verified', 'is_marketo', 'is_active', 
                   'is_suspended', 'suspension_type', 'is_staff')
    search_fields = ('username', 'email', 'phone')
    ordering = ('username',)
    inlines = [AccountInline, SuspensionEvidenceInline]
    
    fieldsets = (
        (None, {'fields': ('username', 'email', 'password')}),
        ('Personal Info', {'fields': ('phone',)}),
        ('Sashi & Verification', {'fields': ('is_sashi', 'is_email_verified')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
        ('MarketO Referral', {'fields': ('is_marketo', 'referral_code', 'referred_by')}),
        ('Suspension', {
            'fields': ('is_suspended', 'suspension_type', 'suspension_reason', 
                       'suspended_at', 'suspended_until', 'suspension_history'),
            'classes': ('collapse',),
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'phone', 'password1', 'password2', 'is_sashi'),
        }),
    )
    
    readonly_fields = ('suspended_at', 'suspension_history')

    actions = ['suspend_temporary', 'suspend_permanent', 'unsuspend_users']

    @admin.action(description="Suspend selected users temporarily (7 days)")
    def suspend_temporary(self, request, queryset):
        updated = 0
        for user in queryset.filter(is_suspended=False):
            user.suspend('temporary', "Temporary suspension via admin (7 days)", 
                        duration_days=7, suspended_by=request.user)
            updated += 1
        self.message_user(request, f"{updated} users temporarily suspended.")

    @admin.action(description="Suspend selected users permanently (requires evidence)")
    def suspend_permanent(self, request, queryset):
        updated = 0
        for user in queryset.filter(is_suspended=False):
            user.suspend('permanent', "Permanent suspension via admin – evidence required", 
                        suspended_by=request.user)
            SuspensionEvidence.objects.create(
                user=user, 
                description="Admin-initiated permanent suspension"
            )
            updated += 1
        self.message_user(request, f"{updated} users permanently suspended. Evidence records created.")

    @admin.action(description="Unsuspend selected users")
    def unsuspend_users(self, request, queryset):
        updated = 0
        for user in queryset.filter(is_suspended=True):
            user.unsuspend(unsuspended_by=request.user)
            updated += 1
        self.message_user(request, f"{updated} users unsuspended.")

    def save_model(self, request, obj, form, change):
        if obj.is_marketo and not obj.referral_code:
            obj.referral_code = obj.generate_referral_code()
            self.message_user(request, f"Generated referral code {obj.referral_code} for {obj.username}")
        super().save_model(request, obj, form, change)


# ====================== Register Models ======================
admin.site.register(User, CustomUserAdmin)
admin.site.register(Account, AccountAdmin)
admin.site.register(SuspensionEvidence)