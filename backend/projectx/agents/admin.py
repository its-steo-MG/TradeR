# agents/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django import forms
from django.db import transaction
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string
from django.contrib import messages
from decimal import Decimal
import logging

from .models import Agent, AgentDeposit, AgentWithdrawal
from wallet.models import Wallet
from dashboard.models import Transaction

logger = logging.getLogger(__name__)


@admin.register(Agent)
class AgentAdmin(admin.ModelAdmin):
    list_display = ('name', 'method', 'is_active', 'location', 'verified')
    list_filter = ('method', 'is_active', 'verified')
    search_fields = ('name', 'mpesa_phone', 'paypal_email')


class AgentDepositForm(forms.ModelForm):
    class Meta:
        model = AgentDeposit
        fields = '__all__'

    def clean(self):
        if self.instance.pk and self.instance.status == 'verified':
            raise forms.ValidationError("Cannot edit a verified deposit.")
        return super().clean()


@admin.register(AgentDeposit)
class AgentDepositAdmin(admin.ModelAdmin):
    form = AgentDepositForm
    list_display = ('user', 'agent', 'amount_kes', 'amount_usd_display', 'method_badge', 'proof', 'status', 'verified_at')
    list_filter = ('payment_method', 'status', 'agent__method')
    search_fields = ('user__username', 'transaction_code', 'paypal_transaction_id', 'bank_reference')
    readonly_fields = ('payment_method', 'amount_usd', 'created_at', 'updated_at', 'verified_at', 'verified_by')
    actions = ['verify_selected', 'reject_selected']

    def amount_usd_display(self, obj):
        return f"${obj.amount_usd:,.2f}"
    amount_usd_display.short_description = "USD"

    def method_badge(self, obj):
        icons = {
            'mpesa': 'Mobile',
            'paypal': 'PayPal',
            'bank_transfer': 'Bank'
        }
        return format_html('<b>{}</b>', icons.get(obj.payment_method, ''))
    method_badge.short_description = "Method"

    def proof(self, obj):
        if obj.paypal_transaction_id:
            url = f"https://www.paypal.com/activity/payment/{obj.paypal_transaction_id}"
            return format_html('<a href="{}" target="_blank">PayPal Tx</a>', url)
        if obj.screenshot:
            return format_html('<a href="{}" target="_blank">View Proof</a>', obj.screenshot.url)
        return "—"
    proof.short_description = "Proof"

    # =========================================
    # VERIFY SELECTED – CREDITS WALLET
    # =========================================
    def verify_selected(self, request, queryset):
        updated = 0
        errors = []

        with transaction.atomic():
            for deposit in queryset.filter(status='pending'):
                try:
                    logger.info(f"[VERIFY] Starting deposit ID {deposit.id} for {deposit.user.username}")

                    # === RECALCULATE amount_usd if missing or invalid ===
                    if not deposit.amount_usd or deposit.amount_usd <= 0:
                        rate = deposit.agent.deposit_rate_kes_to_usd
                        if rate <= 0:
                            raise ValueError("Agent deposit rate is invalid (≤ 0)")
                        deposit.amount_usd = deposit.amount_kes / rate
                        deposit.amount_usd = deposit.amount_usd.quantize(Decimal('0.01'))
                        deposit.save(update_fields=['amount_usd'])
                        logger.info(f"[VERIFY] Recalculated amount_usd: {deposit.amount_usd}")

                    # === Update status ===
                    deposit.status = 'verified'
                    deposit.verified_by = request.user
                    deposit.verified_at = timezone.now()
                    deposit.save()

                    # === CREDIT WALLET ===
                    try:
                        wallet = Wallet.objects.select_for_update().get(
                            account=deposit.account,
                            wallet_type='main',
                            currency__code='USD'
                        )
                    except Wallet.DoesNotExist:
                        raise Wallet.DoesNotExist(f"USD main wallet not found for account {deposit.account.id}")

                    old_balance = wallet.balance
                    wallet.balance += deposit.amount_usd
                    wallet.save(update_fields=['balance'])

                    logger.info(f"[WALLET] Credited: {old_balance} → {wallet.balance} (+{deposit.amount_usd})")

                    # === Log transaction ===
                    Transaction.objects.create(
                        account=deposit.account,
                        amount=deposit.amount_usd,
                        transaction_type='deposit',
                        description=(
                            f"Verified deposit via {deposit.agent.name} "
                            f"({deposit.amount_kes} KES → {deposit.amount_usd} USD)"
                        )
                    )

                    # === Send email – PASS FORMATTED STRINGS ===
                    html_content = render_to_string('emails/deposit_verified.html', {
                        'amount_kes': f"{deposit.amount_kes:,.2f}",
                        'amount_usd': f"{deposit.amount_usd:,.2f}",
                        'agent_name': deposit.agent.name,
                        'user_name': deposit.user.get_full_name() or deposit.user.username,
                    })
                    email = EmailMultiAlternatives(
                        "Deposit Verified & Credited!",
                        "Your deposit has been confirmed and added to your wallet.",
                        settings.DEFAULT_FROM_EMAIL,
                        [deposit.user.email]
                    )
                    email.attach_alternative(html_content, "text/html")
                    email.send(fail_silently=False)

                    updated += 1
                    logger.info(f"[SUCCESS] Deposit {deposit.id} verified and credited.")

                except Exception as e:
                    raw_error = str(e)
                    safe_error = raw_error.replace('{', '').replace('}', '').replace('|', ' ').replace(':', ' ')
                    error_msg = f"Deposit {deposit.id}: {safe_error}"
                    errors.append(error_msg)
                    logger.error(f"[ERROR] {error_msg}")

        if updated:
            self.message_user(
                request,
                f"{updated} deposit(s) verified and wallet(s) credited.",
                messages.SUCCESS
            )
        if errors:
            self.message_user(request, "Errors: " + "; ".join(errors), messages.ERROR)

    verify_selected.short_description = "Verify & Credit Selected"

    # =========================================
    # REJECT SELECTED
    # =========================================
    def reject_selected(self, request, queryset):
        updated = 0
        errors = []

        for deposit in queryset.filter(status='pending'):
            try:
                deposit.status = 'rejected'
                deposit.save()

                html_content = render_to_string('emails/deposit_rejected.html', {
                    'amount_kes': f"{deposit.amount_kes:,.2f}",
                    'agent_name': deposit.agent.name,
                })
                email = EmailMultiAlternatives(
                    "Deposit Rejected",
                    "Your deposit was rejected. Please contact support.",
                    settings.DEFAULT_FROM_EMAIL,
                    [deposit.user.email]
                )
                email.attach_alternative(html_content, "text/html")
                email.send(fail_silently=False)

                updated += 1
                logger.info(f"[REJECT] Deposit {deposit.id} rejected.")

            except Exception as e:
                safe_error = str(e).replace('{', '').replace('}', '').replace('|', ' ')
                error_msg = f"Deposit {deposit.id}: {safe_error}"
                errors.append(error_msg)
                logger.error(f"[ERROR] {error_msg}")

        if updated:
            self.message_user(request, f"{updated} deposit(s) rejected.", messages.SUCCESS)
        if errors:
            self.message_user(request, "\n".join(errors), messages.ERROR)

    reject_selected.short_description = "Reject Selected"


@admin.register(AgentWithdrawal)
class AgentWithdrawalAdmin(admin.ModelAdmin):
    list_display = ('user', 'agent', 'amount_usd', 'amount_kes', 'method_badge', 'status', 'user_details', 'created_at')
    list_filter = ('payment_method', 'status')
    search_fields = ('user__username', 'user_paypal_email', 'user_bank_account_number')
    readonly_fields = ('payment_method', 'amount_kes', 'created_at', 'updated_at', 'completed_at', 'otp_sent_at')
    actions = ['complete_selected', 'reject_refund']

    def method_badge(self, obj):
        icons = {'mpesa': 'Mobile', 'paypal': 'PayPal', 'bank_transfer': 'Bank'}
        return format_html('<b>{}</b>', icons.get(obj.payment_method, ''))
    method_badge.short_description = "Method"

    def user_details(self, obj):
        if obj.payment_method == 'paypal':
            return obj.user_paypal_email or 'N/A'
        elif obj.payment_method == 'bank_transfer':
            return format_html(
                'Bank: {}<br>Acc Name: {}<br>Acc No: {}<br>SWIFT: {}',
                obj.user_bank_name or 'N/A',
                obj.user_bank_account_name or 'N/A',
                obj.user_bank_account_number or 'N/A',
                obj.user_bank_swift or 'N/A'
            )
        return 'N/A'
    user_details.short_description = "User Details"

    def complete_selected(self, request, queryset):
        updated = 0
        errors = []
        for w in queryset.filter(status='otp_verified'):
            try:
                w.status = 'completed'
                w.completed_at = timezone.now()
                w.save()

                html_content = render_to_string('emails/withdrawal_sent.html', {
                    'amount_usd': f"{w.amount_usd:,.2f}",
                    'amount_kes': f"{w.amount_kes:,.2f}",
                    'method': w.get_payment_method_display(),
                    'agent_name': w.agent.name,
                })
                email = EmailMultiAlternatives(
                    "Withdrawal Completed!",
                    "Your funds have been sent.",
                    settings.DEFAULT_FROM_EMAIL,
                    [w.user.email]
                )
                email.attach_alternative(html_content, "text/html")
                email.send(fail_silently=False)

                updated += 1

            except Exception as e:
                safe_error = str(e).replace('{', '').replace('}', '').replace('|', ' ')
                errors.append(f"Withdrawal {w.id}: {safe_error}")

        if updated:
            self.message_user(request, f"{updated} withdrawal(s) marked as sent.", messages.SUCCESS)
        if errors:
            self.message_user(request, "\n".join(errors), messages.ERROR)

    complete_selected.short_description = "Mark as Sent"

    def reject_refund(self, request, queryset):
        updated = 0
        errors = []

        with transaction.atomic():
            for w in queryset.filter(status='otp_verified'):
                try:
                    w.status = 'rejected'
                    w.save()

                    wallet = Wallet.objects.select_for_update().get(
                        account=w.account,
                        wallet_type='main',
                        currency__code='USD'
                    )
                    old_balance = wallet.balance
                    wallet.balance += w.amount_usd
                    wallet.save(update_fields=['balance'])

                    Transaction.objects.create(
                        account=w.account,
                        amount=w.amount_usd,
                        transaction_type='refund',
                        description=f"Rejected withdrawal via {w.agent.name}"
                    )

                    updated += 1

                except Exception as e:
                    safe_error = str(e).replace('{', '').replace('}', '').replace('|', ' ')
                    errors.append(f"Withdrawal {w.id}: {safe_error}")

        if updated:
            self.message_user(request, f"{updated} withdrawal(s) rejected and refunded.", messages.SUCCESS)
        if errors:
            self.message_user(request, "\n".join(errors), messages.ERROR)

    reject_refund.short_description = "Reject & Refund"