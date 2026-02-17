# admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django import forms
from .models import User, Account, SuspensionEvidence
from dashboard.models import Transaction
from django.apps import apps

# admin.py

class SuspensionEvidenceInline(admin.TabularInline):
    model = SuspensionEvidence
    extra = 0
    fields = ('evidence_file', 'description', 'status', 'reviewed_by', 'reviewed_at')
    fk_name = 'user'
    readonly_fields = ('status', 'reviewed_by', 'reviewed_at')  # optional
    can_delete = True
    show_change_link = True  # adds link to full evidence change page

class AccountForm(forms.ModelForm):
    balance = forms.DecimalField(max_digits=12, decimal_places=2, required=False)

    class Meta:
        model = Account
        fields = ['account_type', 'balance']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            self.fields['balance'].initial = self.instance.balance

    def save(self, commit=True):
        instance = super().save(commit=False)
        if 'balance' in self.changed_data:
            instance.balance = self.cleaned_data['balance']
        if commit:
            instance.save()
        return instance

class AccountInline(admin.TabularInline):
    model = Account
    extra = 0
    form = AccountForm
    fields = ('account_type', 'balance')

    def save_model(self, request, obj, form, change):
        if change and 'balance' in form.changed_data:
            old_balance = obj.balance
            new_balance = form.cleaned_data['balance']
            diff = new_balance - old_balance
            if diff != 0:
                obj.balance = new_balance
                Transaction.objects.create(
                    account=obj,
                    amount=diff,
                    transaction_type='deposit' if diff > 0 else 'withdrawal',
                    description=f"Admin balance update: Account {obj.id}"
                )
        super().save_model(request, obj, form, change)

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ('username', 'email', 'phone', 'is_sashi', 'is_email_verified', 'referral_code', 'is_active', 'is_suspended', 'suspension_type')
    list_filter = ('is_sashi', 'is_email_verified', 'is_marketo', 'is_active', 'is_suspended', 'suspension_type', 'is_staff')
    search_fields = ('username', 'email', 'phone')
    ordering = ('username',)
    inlines = [AccountInline, SuspensionEvidenceInline]  # Added evidence inline
    
    fieldsets = (
        (None, {'fields': ('username', 'email', 'password')}),
        ('Personal Info', {'fields': ('phone',)}),
        ('Sashi & Verification', {'fields': ('is_sashi', 'is_email_verified')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
        ('MarketO Referral', {'fields': ('is_marketo', 'referral_code', 'referred_by')}),
        # New suspension fieldset
        ('Suspension', {
            'fields': ('is_suspended', 'suspension_type', 'suspension_reason', 'suspended_at', 'suspended_until', 'suspension_history'),
            'classes': ('collapse',),  # Collapsible for UX
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'phone', 'password1', 'password2', 'is_sashi'),
        }),
    )
    
    readonly_fields = ('suspended_at', 'suspension_history')  # Prevent editing history

    actions = ['suspend_temporary', 'suspend_permanent', 'unsuspend_users']

    @admin.action(description="Suspend selected users temporarily (7 days)")
    def suspend_temporary(self, request, queryset):
        updated = 0
        for user in queryset.filter(is_suspended=False):
            user.suspend('temporary', "Temporary suspension via admin (7 days)", duration_days=7, suspended_by=request.user)
            updated += 1
        self.message_user(request, f"{updated} users temporarily suspended.")

    @admin.action(description="Suspend selected users permanently (requires evidence)")
    def suspend_permanent(self, request, queryset):
        updated = 0
        for user in queryset.filter(is_suspended=False):
            user.suspend('permanent', "Permanent suspension via admin – evidence required", suspended_by=request.user)
            # Auto-create pending evidence record
            SuspensionEvidence.objects.create(user=user, description="Admin-initiated permanent suspension")
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
        # Existing referral code gen
        if obj.is_marketo and not obj.referral_code:
            obj.referral_code = obj.generate_referral_code()
            self.message_user(request, f"Generated referral code {obj.referral_code} for {obj.username}")
        super().save_model(request, obj, form, change)

admin.site.register(User, CustomUserAdmin)
admin.site.register(Account)
admin.site.register(SuspensionEvidence)  # Standalone for review