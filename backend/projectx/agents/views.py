# agents/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import Agent, AgentDeposit, AgentWithdrawal
from .serializers import AgentSerializer, AgentDepositSerializer, AgentWithdrawalSerializer
from wallet.models import Wallet
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from dashboard.models import Transaction
from django.core.mail import EmailMultiAlternatives, send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.urls import reverse
import logging

logger = logging.getLogger(__name__)
ADMIN_EMAIL = "steomustadd@gmail.com"


class AgentListView(APIView):
    def get(self, request):
        agents = Agent.objects.filter(is_active=True)
        serializer = AgentSerializer(agents, many=True, context={'request': request})
        return Response(serializer.data)


class AgentDepositView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = AgentDepositSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            deposit = serializer.save(user=request.user)

            # === ADMIN EMAIL NOTIFICATION (New Deposit Alert) ===
            try:
                proof_link = ""
                tx_info = ""

                if deposit.screenshot:
                    proof_link = request.build_absolute_uri(deposit.screenshot.url)

                if deposit.payment_method == 'paypal' and deposit.paypal_transaction_id:
                    proof_link = f"https://www.paypal.com/activity/payment/{deposit.paypal_transaction_id}"
                    tx_info = deposit.paypal_transaction_id
                elif deposit.payment_method == 'binance' and deposit.binance_tx_hash:
                    tx_info = deposit.binance_tx_hash
                    proof_link = f"https://bscscan.com/tx/{deposit.binance_tx_hash}"
                elif deposit.transaction_code:
                    tx_info = deposit.transaction_code
                elif deposit.bank_reference:
                    tx_info = deposit.bank_reference

                send_mail(
                    subject=f"New Deposit Request – {deposit.get_payment_method_display()}",
                    message=(
                        f"User: {deposit.user.username} ({deposit.user.email})\n"
                        f"Amount: KSh {deposit.amount_kes:,.2f} → ${deposit.amount_usd:,.2f} USD\n"
                        f"Agent: {deposit.agent.name} ({deposit.agent.method})\n"
                        f"Method: {deposit.get_payment_method_display()}\n"
                        f"Transaction Code / ID: {tx_info or '—'}\n"
                        f"Proof: {proof_link or 'No proof yet'}\n"
                        f"Time: {timezone.localtime().strftime('%Y-%m-%d %H:%M %Z')}\n\n"
                        f"Go to admin → Agent Deposits to verify/reject."
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[ADMIN_EMAIL],
                    fail_silently=False,
                )
            except Exception as e:
                logger.error(f"Failed to send admin deposit notification: {e}")

            logger.info(f"Deposit created: {deposit.id} for {request.user.username}")
            return Response({
                "message": "Deposit request received! We will verify and credit your wallet shortly.",
                "deposit_id": deposit.id
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AgentDepositVerifyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        deposit_id = request.data.get("deposit_id")
        action = request.data.get("action")

        if action not in ("verify", "reject"):
            return Response({"error": "action must be 'verify' or 'reject'"}, status=400)

        try:
            deposit = AgentDeposit.objects.get(id=deposit_id, status='pending')
        except AgentDeposit.DoesNotExist:
            return Response({"error": "Deposit not found or already processed"}, status=400)

        with transaction.atomic():
            if action == "verify":
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
                wallet.save()

                Transaction.objects.create(
                    account=deposit.account,
                    amount=deposit.amount_usd,
                    transaction_type='deposit',
                    description=f"Agent Deposit [{deposit.get_payment_method_display()}] - {deposit.agent.name}"
                )

                html_content = render_to_string('emails/deposit_verified.html', {
                    'method': deposit.get_payment_method_display(),
                    'amount_kes': f"{deposit.amount_kes:,.2f}",
                    'agent_name': deposit.agent.name,
                    'amount_usd': f"{deposit.amount_usd:,.2f}",
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

                logger.info(f"Deposit {deposit.id} verified for {deposit.user.username}")
                return Response({"message": "Deposit verified & wallet credited"}, status=200)

            else:
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

                logger.info(f"Deposit {deposit.id} rejected for {deposit.user.username}")
                return Response({"message": "Deposit rejected"}, status=200)


class AgentWithdrawalRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = AgentWithdrawalSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            withdrawal = serializer.save()
            logger.info(f"Withdrawal created: {withdrawal.id} for {request.user.username}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AgentWithdrawalVerifyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        withdrawal_id = request.data.get('withdrawal_id')
        otp = request.data.get('otp')

        try:
            withdrawal = AgentWithdrawal.objects.get(
                id=withdrawal_id,
                user=request.user,
                status='pending_otp'
            )
            if withdrawal.is_otp_expired():
                return Response({'error': 'OTP expired'}, status=400)
            if withdrawal.otp_code != otp:
                return Response({'error': 'Invalid OTP'}, status=400)

            with transaction.atomic():
                wallet = Wallet.objects.select_for_update().get(
                    account=withdrawal.account,
                    wallet_type='main',
                    currency__code='USD'
                )
                if wallet.balance < withdrawal.amount_usd:
                    return Response({'error': 'Insufficient balance'}, status=400)

                wallet.balance -= withdrawal.amount_usd
                wallet.save()

                withdrawal.status = 'otp_verified'
                withdrawal.save()

                Transaction.objects.create(
                    account=withdrawal.account,
                    amount=-withdrawal.amount_usd,
                    transaction_type='withdrawal',
                    description=f"Withdrawal via {withdrawal.agent.name} ({withdrawal.get_payment_method_display()}) – Awaiting payment"
                )

            html_content = render_to_string('emails/withdrawal_locked.html', {
                'amount_usd': f"{withdrawal.amount_usd:,.2f}",
                'agent_name': withdrawal.agent.name,
                'amount_kes': f"{withdrawal.amount_kes:,.2f}",
                'method': withdrawal.get_payment_method_display(),
                'user_details': self._get_user_details(withdrawal)
            })

            user_email = EmailMultiAlternatives(
                subject="Withdrawal in Progress",
                body="Your funds have been reserved and will be sent shortly.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[withdrawal.user.email]
            )
            user_email.attach_alternative(html_content, "text/html")
            user_email.send(fail_silently=False)

            try:
                admin_url = request.build_absolute_uri(
                    reverse('admin:agents_agentwithdrawal_change', args=[withdrawal.id])
                )

                payout_details = self._get_user_details(withdrawal)
                if not payout_details.strip():
                    payout_details = "M-Pesa (phone from profile)"

                send_mail(
                    subject=f"Withdrawal Ready – {withdrawal.get_payment_method_display()}",
                    message=(
                        f"USER: {withdrawal.user.get_full_name() or withdrawal.user.username}\n"
                        f"Email: {withdrawal.user.email}\n"
                        f"Amount: ${withdrawal.amount_usd:,.2f} USD → KSh {withdrawal.amount_kes:,.2f}\n"
                        f"Agent: {withdrawal.agent.name}\n"
                        f"Method: {withdrawal.get_payment_method_display()}\n"
                        f"Payout Details:\n{payout_details}\n\n"
                        f"Funds deducted from wallet.\n"
                        f"Time: {timezone.localtime().strftime('%Y-%m-%d %H:%M %Z')}\n\n"
                        f"Action Required: Send money & mark as completed\n"
                        f"Admin Link: {admin_url}"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[ADMIN_EMAIL],
                    fail_silently=False,
                )
            except Exception as e:
                logger.error(f"Failed to send admin withdrawal alert: {e}")

            logger.info(f"Withdrawal {withdrawal.id} OTP verified for {withdrawal.user.username}")
            return Response({
                'message': 'Withdrawal request received. Funds will be sent shortly.'
            })

        except AgentWithdrawal.DoesNotExist:
            return Response({'error': 'Invalid withdrawal'}, status=400)
        except Exception as e:
            logger.error(f"Error verifying withdrawal: {str(e)}")
            return Response({'error': 'Server error'}, status=500)

    def _get_user_details(self, withdrawal):
        if withdrawal.payment_method == 'paypal':
            return f"   • PayPal Email: {withdrawal.user_paypal_email}"
        elif withdrawal.payment_method == 'bank_transfer':
            return (
                f"   • Bank: {withdrawal.user_bank_name}\n"
                f"   • Account Name: {withdrawal.user_bank_account_name}\n"
                f"   • Account Number: {withdrawal.user_bank_account_number}\n"
                f"   • SWIFT: {withdrawal.user_bank_swift or 'N/A'}"
            )
        elif withdrawal.payment_method == 'binance':
            # === FIXED: Now properly shows Binance address ===
            return f"   • Binance Address: {withdrawal.user_binance_address or 'Not provided'}"
        else:  # mpesa
            phone = getattr(withdrawal.user, 'phone', 'Not set')
            return f"   • M-Pesa Phone: {phone}"


class AgentWithdrawalAdminActionView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        withdrawal_id = request.data.get("withdrawal_id")
        action = request.data.get("action")

        if action not in ("complete", "reject"):
            return Response({"error": "action must be 'complete' or 'reject'"}, status=400)

        try:
            withdrawal = AgentWithdrawal.objects.get(id=withdrawal_id, status='otp_verified')
        except AgentWithdrawal.DoesNotExist:
            return Response({"error": "Not found or already processed"}, status=400)

        method = withdrawal.get_payment_method_display()

        if action == "complete":
            withdrawal.status = 'completed'
            withdrawal.completed_at = timezone.now()
            withdrawal.save()

            # ===== SEND TRADE RISER PUSH NOTIFICATION =====
            try:
                from notifications.utils import send_web_push
                send_web_push(
                    user=withdrawal.user,
                    title="TradeRiser",
                    body=(
                        f"Dear Trader,\n"
                        f"TradeRiser has sent you Ksh {withdrawal.amount_kes:,.2f}.\n"
                        f"Method: {method}\n"
                        f"Please check your account."
                    ),
                    data={
                        "type": "agent_withdrawal",
                        "id": withdrawal.id,
                    }
                )
            except Exception as e:
                logger.error(f"Failed to send push for agent withdrawal {withdrawal.id}: {e}")
            # ==============================================

            html_content = render_to_string('emails/withdrawal_sent.html', {
                'amount_usd': f"{withdrawal.amount_usd:,.2f}",
                'amount_kes': f"{withdrawal.amount_kes:,.2f}",
                'method': method,
                'agent_name': withdrawal.agent.name,
                'user_details': self._get_user_details(withdrawal)
            })

            email = EmailMultiAlternatives(
                subject="Withdrawal Sent Successfully!",
                body="Your funds have been transferred.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[withdrawal.user.email]
            )
            email.attach_alternative(html_content, "text/html")
            email.send(fail_silently=False)

            logger.info(f"Withdrawal {withdrawal.id} completed for {withdrawal.user.username}")
            return Response({"message": f"Withdrawal completed – {method} sent"})

        else:
            with transaction.atomic():
                withdrawal.status = 'rejected'
                withdrawal.save()

                wallet = Wallet.objects.select_for_update().get(
                    account=withdrawal.account,
                    wallet_type='main',
                    currency__code='USD'
                )
                wallet.balance += withdrawal.amount_usd
                wallet.save()

                Transaction.objects.create(
                    account=withdrawal.account,
                    amount=withdrawal.amount_usd,
                    transaction_type='refund',
                    description=f"Rejected withdrawal via {withdrawal.agent.name}"
                )

                html_content = render_to_string('emails/withdrawal_rejected.html', {
                    'amount_usd': f"{withdrawal.amount_usd:,.2f}"
                })

                email = EmailMultiAlternatives(
                    subject="Withdrawal Rejected & Refunded",
                    body="Your withdrawal was rejected; funds have been refunded.",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[withdrawal.user.email]
                )
                email.attach_alternative(html_content, "text/html")
                email.send(fail_silently=False)

            logger.info(f"Withdrawal {withdrawal.id} rejected and refunded for {withdrawal.user.username}")
            return Response({"message": "Withdrawal rejected & refunded"})