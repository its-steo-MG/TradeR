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
from notifications.utils import send_web_push
from agents.utils import generate_withdrawal_receipt_pdf   # ← clean import

logger = logging.getLogger(__name__)


@admin.register(Agent)
class AgentAdmin(admin.ModelAdmin):
    list_display = ('name', 'method', 'is_active', 'location', 'verified')
    list_filter = ('method', 'is_active', 'verified')
    search_fields = ('name', 'mpesa_phone', 'paypal_email', 'binance_address')


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
    list_display = ('user', 'agent', 'amount_kes', 'amount_usd_display',
                    'method_badge', 'proof', 'status', 'verified_at')
    list_filter = ('payment_method', 'status', 'agent__method')
    search_fields = ('user__username', 'transaction_code', 'paypal_transaction_id',
                     'bank_reference', 'binance_tx_hash')
    readonly_fields = ('payment_method', 'amount_usd', 'created_at',
                       'updated_at', 'verified_at', 'verified_by')
    actions = ['verify_selected', 'reject_selected']

    def amount_usd_display(self, obj):
        return f"${obj.amount_usd:,.2f}"
    amount_usd_display.short_description = "USD"

    def method_badge(self, obj):
        icons = {
            'mpesa': 'Mobile',
            'paypal': 'PayPal',
            'bank_transfer': 'Bank',
            'binance': 'Binance'
        }
        return format_html('<b>{}</b>', icons.get(obj.payment_method, ''))
    method_badge.short_description = "Method"

    def proof(self, obj):
        if obj.paypal_transaction_id:
            url = f"https://www.paypal.com/activity/payment/{obj.paypal_transaction_id}"
            return format_html('<a href="{}" target="_blank">PayPal Tx</a>', url)
        elif obj.binance_tx_hash:
            explorer_url = f"https://bscscan.com/tx/{obj.binance_tx_hash}"
            return format_html(
                '<a href="{}" target="_blank">Binance Tx</a><br><small>{}</small>',
                explorer_url, obj.binance_tx_hash[:16] + "..."
            )
        elif obj.screenshot:
            return format_html('<a href="{}" target="_blank">View Proof</a>', obj.screenshot.url)
        return "—"
    proof.short_description = "Proof"

    def verify_selected(self, request, queryset):
        updated = 0
        errors = []

        with transaction.atomic():
            for deposit in queryset.filter(status='pending'):
                try:
                    logger.info(f"[VERIFY] Starting deposit ID {deposit.id} for {deposit.user.username}")

                    if not deposit.amount_usd or deposit.amount_usd <= 0:
                        rate = deposit.agent.deposit_rate_kes_to_usd
                        if rate <= 0:
                            raise ValueError("Agent deposit rate is invalid")
                        deposit.amount_usd = deposit.amount_kes / rate
                        deposit.amount_usd = deposit.amount_usd.quantize(Decimal('0.01'))
                        deposit.save(update_fields=['amount_usd'])

                    deposit.status = 'verified'
                    deposit.verified_by = request.user
                    deposit.verified_at = timezone.now()
                    deposit.save()

                    wallet = Wallet.objects.select_for_update().get(
                        account=deposit.account,
                        wallet_type='main',
                        currency__code='USD'
                    )
                    wallet.balance += deposit.amount_usd
                    wallet.save(update_fields=['balance'])

                    Transaction.objects.create(
                        account=deposit.account,
                        amount=deposit.amount_usd,
                        transaction_type='deposit',
                        description=f"Verified deposit via {deposit.agent.name} ({deposit.amount_kes} KES → ${deposit.amount_usd} USD)"
                    )

                    html_content = render_to_string('emails/deposit_verified.html', {
                        'amount_kes': f"{deposit.amount_kes:,.2f}",
                        'amount_usd': f"{deposit.amount_usd:,.2f}",
                        'agent_name': deposit.agent.name,
                        'user_name': deposit.user.get_full_name() or deposit.user.username,
                    })

                    email = EmailMultiAlternatives(
                        subject="Deposit Verified & Credited!",
                        body="Your deposit has been confirmed and added to your wallet.",
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        to=[deposit.user.email]
                    )
                    email.attach_alternative(html_content, "text/html")
                    email.send(fail_silently=False)

                    updated += 1
                    logger.info(f"[SUCCESS] Deposit {deposit.id} verified and credited.")

                except Exception as e:
                    error_msg = f"Deposit {deposit.id}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(error_msg)

        if updated:
            self.message_user(request, f"{updated} deposit(s) verified and credited.", messages.SUCCESS)
        if errors:
            self.message_user(request, "Errors: " + "; ".join(errors), messages.ERROR)

    verify_selected.short_description = "Verify & Credit Selected"

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
                    subject="Deposit Rejected",
                    body="Your deposit was rejected. Please contact support.",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[deposit.user.email]
                )
                email.attach_alternative(html_content, "text/html")
                email.send(fail_silently=False)

                updated += 1

            except Exception as e:
                errors.append(f"Deposit {deposit.id}: {str(e)}")

        if updated:
            self.message_user(request, f"{updated} deposit(s) rejected.", messages.SUCCESS)
        if errors:
            self.message_user(request, "\n".join(errors), messages.ERROR)

    reject_selected.short_description = "Reject Selected"


@admin.register(AgentWithdrawal)
class AgentWithdrawalAdmin(admin.ModelAdmin):
    list_display = ('user', 'agent', 'amount_usd', 'amount_kes', 'method_badge', 'status', 'user_details', 'created_at')
    list_filter = ('payment_method', 'status')
    search_fields = ('user__username', 'user_paypal_email', 'user_bank_account_number', 'user_binance_address')
    readonly_fields = ('payment_method', 'amount_kes', 'created_at', 'updated_at', 'completed_at', 'otp_sent_at')
    actions = ['complete_selected', 'reject_refund']

    def method_badge(self, obj):
        icons = {
            'mpesa': 'Mobile',
            'paypal': 'PayPal',
            'bank_transfer': 'Bank',
            'binance': 'Binance'
        }
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
        elif obj.payment_method == 'binance':
            return obj.user_binance_address or 'N/A'
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

                # Push notification
                try:
                    send_web_push(
                        user=w.user,
                        title="TradeRiser",
                        body=(
                            f"Dear Trader,\n"
                            f"TradeRiser has sent you Ksh {w.amount_kes:,.2f}.\n"
                            f"Method: {w.get_payment_method_display()}\n"
                            f"Please check your account."
                        ),
                        data={
                            "type": "agent_withdrawal",
                            "id": w.id,
                        }
                    )
                except Exception as push_err:
                    logger.error(f"Push failed for withdrawal {w.id}: {push_err}")

                # Create final transaction record
                Transaction.objects.create(
                    account=w.account,
                    amount=-w.amount_usd,
                    transaction_type='withdrawal',
                    description=f"Withdrawal completed via {w.agent.name} ({w.get_payment_method_display()})"
                )

                # === GENERATE + ATTACH RECEIPT ===
                try:
                    pdf_buffer = generate_withdrawal_receipt_pdf(w)

                    html_content = render_to_string('emails/withdrawal_sent.html', {
                        'amount_usd': f"{w.amount_usd:,.2f}",
                        'amount_kes': f"{w.amount_kes:,.2f}",
                        'method': w.get_payment_method_display(),
                        'agent_name': w.agent.name,
                    })

                    email = EmailMultiAlternatives(
                        subject="Withdrawal Sent Successfully! – Your Receipt",
                        body="Your funds have been transferred. Please find your transaction receipt attached.",
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        to=[w.user.email]
                    )
                    email.attach_alternative(html_content, "text/html")
                    email.attach(
                        f"TradeRiser_Receipt_WD-{w.id}.pdf",
                        pdf_buffer.getvalue(),
                        "application/pdf"
                    )
                    email.send(fail_silently=False)

                    logger.info(f"Receipt email sent successfully for withdrawal {w.id}")

                except Exception as email_err:
                    logger.error(f"Failed to send receipt email for withdrawal {w.id}: {email_err}")
                    errors.append(f"Withdrawal {w.id}: Email/PDF failed → {str(email_err)}")

                updated += 1

            except Exception as e:
                errors.append(f"Withdrawal {w.id}: {str(e)}")
                logger.error(f"Complete failed for withdrawal {w.id}: {e}")

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
                    wallet.balance += w.amount_usd
                    wallet.save(update_fields=['balance'])

                    Transaction.objects.create(
                        account=w.account,
                        amount=w.amount_usd,
                        transaction_type='refund',
                        description=f"Rejected withdrawal via {w.agent.name}"
                    )

                    html_content = render_to_string('emails/withdrawal_rejected.html', {
                        'amount_usd': f"{w.amount_usd:,.2f}"
                    })

                    email = EmailMultiAlternatives(
                        subject="Withdrawal Rejected & Refunded",
                        body="Your withdrawal was rejected; funds have been refunded.",
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        to=[w.user.email]
                    )
                    email.attach_alternative(html_content, "text/html")
                    email.send(fail_silently=False)

                    updated += 1

                except Exception as e:
                    errors.append(f"Withdrawal {w.id}: {str(e)}")

        if updated:
            self.message_user(request, f"{updated} withdrawal(s) rejected and refunded.", messages.SUCCESS)
        if errors:
            self.message_user(request, "\n".join(errors), messages.ERROR)

    reject_refund.short_description = "Reject & Refund"