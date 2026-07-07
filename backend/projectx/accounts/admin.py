# admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django import forms
from django.utils import timezone
from django.urls import reverse
from django.utils.html import format_html
import boto3
from botocore.exceptions import ClientError
from django.conf import settings


from .models import User, Account, SuspensionEvidence,KYCSubmission


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
        fields = ['platform', 'account_type', 'balance', 'is_wallet_verified']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            self.fields['balance'].initial = self.instance.balance


# ====================== Inlines ======================
class AccountInline(admin.TabularInline):
    model = Account
    extra = 0
    form = AccountForm
    fields = ('platform', 'account_type', 'balance', 'is_wallet_verified')


class SuspensionEvidenceInline(admin.TabularInline):
    model = SuspensionEvidence
    extra = 0
    fk_name = 'user'
    fields = ('evidence_file', 'description', 'status', 'reviewed_by', 'reviewed_at')
    readonly_fields = ('status', 'reviewed_by', 'reviewed_at', 'created_at')
    can_delete = True
    show_change_link = True


# ====================== Account Admin ======================
class AccountAdmin(admin.ModelAdmin):
    form = AccountForm
    
    list_display = ('user_username', 'platform', 'account_type', 'balance', 'is_wallet_verified', 'id')
    list_filter = ('platform', 'account_type', 'is_wallet_verified')
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
        if change and 'balance' in form.changed_data:
            new_balance = form.cleaned_data.get('balance')
            if new_balance is not None:
                obj.balance = new_balance
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

# ====================== KYC Admin ======================
class KYCSubmissionAdmin(admin.ModelAdmin):
    list_display = ('user_link', 'status', 'submitted_at', 'reviewed_at', 'view_id_document', 'view_selfie', 'view_proof_of_address')
    list_filter = ('status', 'submitted_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('submitted_at', 'reviewed_at', 'view_id_document', 'view_selfie', 'view_proof_of_address')
    actions = ['approve_kyc', 'reject_kyc']

    def user_link(self, obj):
        url = reverse('admin:accounts_user_change', args=[obj.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.user.username)
    user_link.short_description = 'User'

    # Private signed URLs for admin only
    def _get_signed_url(self, file_field, expiration=3600):
        if not file_field:
            return "No file"
        try:
            s3 = boto3.client('s3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )
            url = s3.generate_presigned_url('get_object',
                Params={'Bucket': settings.AWS_STORAGE_BUCKET_NAME, 'Key': file_field.name},
                ExpiresIn=expiration
            )
            return format_html('<a href="{}" target="_blank">🔒 View File</a>', url)
        except Exception as e:
            return f"Error: {str(e)}"

    def view_id_document(self, obj):
        return self._get_signed_url(obj.id_document)
    view_id_document.short_description = 'ID Document'

    def view_selfie(self, obj):
        return self._get_signed_url(obj.selfie)
    view_selfie.short_description = 'Selfie'

    def view_proof_of_address(self, obj):
        return self._get_signed_url(obj.proof_of_address)
    view_proof_of_address.short_description = 'Proof of Address'

    @admin.action(description="Approve selected KYC submissions")
    def approve_kyc(self, request, queryset):
        updated = 0
        for submission in queryset:
            if submission.status != 'approved':
                submission.status = 'approved'
                submission.reviewed_at = timezone.now()
                submission.reviewed_by = request.user
                submission.save()

                submission.user.kyc_status = 'approved'
                submission.user.save()
                updated += 1
        self.message_user(request, f"{updated} KYC submissions approved.")

    @admin.action(description="Reject selected KYC submissions")
    def reject_kyc(self, request, queryset):
        updated = 0
        for submission in queryset:
            if submission.status != 'rejected':
                submission.status = 'rejected'
                submission.reviewed_at = timezone.now()
                submission.reviewed_by = request.user
                submission.save()

                submission.user.kyc_status = 'rejected'
                submission.user.save()
                updated += 1
        self.message_user(request, f"{updated} KYC submissions rejected.")

# ====================== Register Models ======================
admin.site.register(User, CustomUserAdmin)
admin.site.register(Account, AccountAdmin)
admin.site.register(SuspensionEvidence)
admin.site.register(KYCSubmission, KYCSubmissionAdmin)