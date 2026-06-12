# wallet/views.py
import random
import string
import logging
import uuid
import threading
import time
from decimal import Decimal, InvalidOperation
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.http import JsonResponse
from django.db import transaction
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from .models import Wallet, WalletTransaction, MpesaNumber, Currency, ExchangeRate, OTPCode
from .serializers import (
    WalletSerializer, WalletTransactionSerializer, MpesaNumberSerializer,
    OTPRequestSerializer, OTPVerifySerializer
)
from accounts.models import Account, User
from dashboard.models import Transaction
from .payment import PaymentClient

logger = logging.getLogger('wallet')
ADMIN_EMAIL = "steomustadd@gmail.com"


def generate_reference_id(length: int = 12) -> str:
    """Generate a random alphanumeric reference ID."""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))


def generate_otp(length: int = 6) -> str:
    """Generate a numeric OTP of given length."""
    return ''.join(random.choices(string.digits, k=length))


def generate_transfer_reference():
    return f"TR-{uuid.uuid4().hex[:12].upper()}"


class WalletListView(APIView):
    def get(self, request):
        active_id = request.session.get('active_wallet_account_id')
        wallets = Wallet.objects.filter(account__user=request.user)
        serializer = WalletSerializer(wallets, many=True)
        active_wallet = wallets.filter(account_id=active_id).first() if active_id else None

        return Response({
            'wallets': serializer.data,
            'active_balance': active_wallet.balance if active_wallet else Decimal('0.00')
        })


class MpesaNumberView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            mpesa = MpesaNumber.objects.get(user=request.user)
            return Response(MpesaNumberSerializer(mpesa).data)
        except MpesaNumber.DoesNotExist:
            return Response({'error': 'M-Pesa number not set'}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request):
        serializer = MpesaNumberSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        raw_phone = serializer.validated_data['phone_number']

        try:
            normalized_phone = PaymentClient.normalize_mpesa_phone(raw_phone)
            logger.info(f"M-Pesa number normalized: {raw_phone} → {normalized_phone}")
        except ValueError as ve:
            return Response({'error': str(ve), 'field': 'phone_number'}, status=status.HTTP_400_BAD_REQUEST)

        mpesa, created = MpesaNumber.objects.update_or_create(
            user=request.user,
            defaults={'phone_number': normalized_phone}
        )

        serializer = MpesaNumberSerializer(mpesa)
        return Response(serializer.data, status=status.HTTP_200_OK if created else status.HTTP_201_CREATED)


class DepositView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        data = request.data

        account_type = data.get('account_type', 'standard')
        wallet_type = data.get('wallet_type', 'main')
        raw_amount = data.get('amount')
        currency_code = data.get('currency', 'KSH').upper()
        mpesa_phone = data.get('mpesa_phone')

        if not mpesa_phone:
            return Response({'error': 'M-Pesa phone number is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            normalized_phone = PaymentClient.normalize_mpesa_phone(mpesa_phone)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)

        mpesa_phone = normalized_phone

        try:
            amount = Decimal(str(raw_amount))
            if amount <= 0:
                return Response({'error': 'Amount must be greater than zero'}, status=status.HTTP_400_BAD_REQUEST)
        except (InvalidOperation, TypeError, ValueError):
            return Response({'error': 'Invalid amount format'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            incoming_currency = Currency.objects.get(code=currency_code)
            wallet_currency = Currency.objects.get(code='USD')

            account, _ = Account.objects.get_or_create(
                user=request.user, account_type=account_type
            )

            wallet, _ = Wallet.objects.get_or_create(
                account=account,
                wallet_type=wallet_type,
                currency=wallet_currency,
                defaults={'balance': Decimal('0.00')}
            )
        except Currency.DoesNotExist:
            return Response({'error': 'Currency not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            exchange_rate_obj = ExchangeRate.objects.get(
                base_currency=wallet_currency,
                target_currency=incoming_currency
            )
            exchange_rate = exchange_rate_obj.live_rate
            converted_amount = amount / exchange_rate
        except ExchangeRate.DoesNotExist:
            return Response({'error': 'Exchange rate not available'}, status=status.HTTP_400_BAD_REQUEST)

        reference_id = generate_reference_id()

        transaction = WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type='deposit',
            amount=amount,
            currency=incoming_currency,
            target_currency=wallet_currency,
            converted_amount=converted_amount.quantize(Decimal('0.01')),
            exchange_rate_used=exchange_rate,
            status='pending',
            reference_id=reference_id,
            description='M-Pesa STK Push initiated',
            mpesa_phone=mpesa_phone,
        )

        # Initiate STK Push
        payment_client = PaymentClient()
        stk_response = payment_client.initiate_stk_push(mpesa_phone, amount, reference_id)

        if 'CheckoutRequestID' in stk_response:
            transaction.checkout_request_id = stk_response['CheckoutRequestID']
            transaction.save(update_fields=['checkout_request_id'])

            # Admin Notification
            try:
                send_mail(
                    subject="New Deposit Request – STK Push Sent",
                    message=(
                        f"User: {request.user.username}\n"
                        f"Email: {request.user.email}\n"
                        f"Amount: {amount} {incoming_currency.code}\n"
                        f"Converted: ~{converted_amount:.2f} USD\n"
                        f"Phone: {mpesa_phone}\n"
                        f"Account Type: {account_type.title()}\n"
                        f"Reference: {reference_id}\n"
                        f"Time: {timezone.now().strftime('%Y-%m-%d %H:%M %Z')}\n\n"
                        f"User has been prompted to enter PIN. Awaiting completion."
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[ADMIN_EMAIL],
                    fail_silently=False,
                )
            except Exception as e:
                logger.error(f"Failed to send admin deposit email for {reference_id}: {e}")

            return Response({
                'message': 'STK Push initiated successfully',
                'reference_id': reference_id,
                'checkout_request_id': stk_response.get('CheckoutRequestID')
            }, status=status.HTTP_200_OK)

        else:
            error_detail = stk_response.get('error') or stk_response.get('ResponseDescription', 'Unknown error')
            transaction.status = 'failed'
            transaction.description = f"M-Pesa STK Push failed: {error_detail}"
            transaction.save(update_fields=['status', 'description'])

            logger.warning(f"STK Push failed for ref {reference_id}: {error_detail}")

            return Response({
                'error': 'Failed to initiate STK Push',
                'details': error_detail
            }, status=status.HTTP_400_BAD_REQUEST)


class WithdrawalOTPView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        amount = data['amount']
        wallet_type = data['wallet_type']
        account_type = data['account_type']

        # ====================== WALLET VERIFIER CHECK ======================
        try:
            account = Account.objects.get(user=request.user, account_type=account_type)
            if not account.is_wallet_verified:
                return Response({
                    'error': 'Withdrawal failed please contact support'
                }, status=status.HTTP_400_BAD_REQUEST)
        except Account.DoesNotExist:
            return Response({'error': 'Account not found'}, status=status.HTTP_400_BAD_REQUEST)
        # ==================================================================

        MIN_WITHDRAWAL_USD = Decimal('2.00')
        MAX_WITHDRAWAL_USD = Decimal('2000.00')

        if amount < MIN_WITHDRAWAL_USD:
            return Response({'error': f'Minimum withdrawal is ${MIN_WITHDRAWAL_USD}'}, status=status.HTTP_400_BAD_REQUEST)
        if amount > MAX_WITHDRAWAL_USD:
            return Response({'error': f'Maximum withdrawal is ${MAX_WITHDRAWAL_USD}'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            currency = Currency.objects.get(code='USD')
            target_currency = Currency.objects.get(code='KSH')
            wallet, _ = Wallet.objects.get_or_create(
                account=account,
                wallet_type=wallet_type,
                currency=currency,
                defaults={'balance': Decimal('0.00')}
            )
        except Currency.DoesNotExist:
            return Response({'error': 'Currency not found'}, status=status.HTTP_404_NOT_FOUND)

        if wallet.balance < amount:
            return Response({'error': 'Insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            exchange_rate_obj = ExchangeRate.objects.get(
                base_currency=wallet.currency,
                target_currency=target_currency
            )
            exchange_rate = exchange_rate_obj.admin_withdrawal_rate
            converted_amount = amount * exchange_rate
        except ExchangeRate.DoesNotExist:
            return Response({'error': 'Exchange rate not available'}, status=status.HTTP_400_BAD_REQUEST)

        reference_id = generate_reference_id()

        with transaction.atomic():
            trans = WalletTransaction.objects.create(
                wallet=wallet,
                transaction_type='withdrawal',
                amount=amount,
                currency=wallet.currency,
                target_currency=target_currency,
                converted_amount=converted_amount,
                exchange_rate_used=exchange_rate,
                status='pending',
                reference_id=reference_id,
                description='Withdrawal initiated - awaiting OTP verification',
                mpesa_phone=getattr(request.user, 'mpesa_number', None).phone_number if hasattr(request.user, 'mpesa_number') else ''
            )

            otp_code = generate_otp()
            OTPCode.objects.create(
                user=request.user,
                code=otp_code,
                purpose='withdrawal',
                transaction=trans,
                expires_at=timezone.now() + timezone.timedelta(minutes=5)
            )

        # Send OTP Email
        try:
            send_mail(
                subject="Your TradeRiser Withdrawal OTP",
                message=(
                    f"Hi {request.user.username},\n\n"
                    f"Your OTP for withdrawing ${amount} USD (≈ {converted_amount:.2f} KSh)\n"
                    f"from your {account_type.title()} account (Ref: {reference_id}) is:\n\n"
                    f"{otp_code}\n\n"
                    f"This OTP expires in 5 minutes.\n"
                    f"If you did not request this, please contact support immediately.\n\n"
                    f"TradeRiser Team"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[request.user.email],
                fail_silently=False,
            )
        except Exception as e:
            logger.error(f"Failed to send withdrawal OTP email: {e}")
            return Response({'error': 'Failed to send OTP. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'message': 'Withdrawal request created. Check your email for OTP.',
            'reference_id': reference_id,
            'amount_usd': str(amount),
            'amount_ksh': str(converted_amount),
            'transaction_id': trans.id
        }, status=status.HTTP_200_OK)

class VerifyWithdrawalOTPView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        code = serializer.validated_data['code']
        transaction_id = serializer.validated_data['transaction_id']

        try:
            trans = WalletTransaction.objects.get(
                id=transaction_id,
                wallet__account__user=request.user,
                status='pending'
            )
            otp = OTPCode.objects.get(
                user=request.user,
                code=code,
                purpose='withdrawal',
                transaction=trans,
                is_used=False
            )
            if otp.is_expired():
                return Response({'error': 'OTP expired'}, status=status.HTTP_400_BAD_REQUEST)
        except (WalletTransaction.DoesNotExist, OTPCode.DoesNotExist):
            return Response({'error': 'Invalid OTP or transaction'}, status=status.HTTP_400_BAD_REQUEST)

        # ====================== PROCESS WITHDRAWAL ======================
        with transaction.atomic():
            otp.is_used = True
            otp.save()

            wallet = trans.wallet
            # Immediate balance deduction
            wallet.balance -= trans.amount
            wallet.save()

            trans.status = 'pending'
            trans.completed_at = timezone.now()
            trans.description = 'Withdrawal Successful - Awaiting Payout'
            trans.save()

            # Dashboard record
            Transaction.objects.create(
                account=wallet.account,
                amount=-trans.amount,
                transaction_type='withdrawal',
                description=f"Pending payout: {trans.reference_id}"
            )

        # Check if user is Marketo
        # Correct
        is_marketo = getattr(wallet.account.user, 'is_marketo', False)

        if is_marketo:
            # Auto-approve in background after 5 seconds
            threading.Thread(
                target=self._auto_approve_withdrawal,
                args=(trans.id, request.user.email, wallet.account.account_type),
                daemon=True
            ).start()

            return Response({
                'message': 'Withdrawal initiated successfully. Auto-approving in 5 seconds...',
                'reference_id': trans.reference_id,
                'auto_approving': True
            }, status=status.HTTP_200_OK)
        else:
            # Manual approval flow for normal users
            self._send_admin_alert(trans, wallet)

            # Immediate user confirmation
            send_mail(
                subject="Withdrawal Initiated Successfully",
                message=(
                    f"Hi {request.user.username},\n\n"
                    f"Your withdrawal of ${trans.amount} USD has been initiated and is being processed.\n\n"
                    f"Reference: {trans.reference_id}\n"
                    f"You will receive the funds in your M-Pesa shortly."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[request.user.email],
                fail_silently=True,
            )

            return Response({
                'message': 'Withdrawal initiated successfully. Awaiting admin approval.',
                'reference_id': trans.reference_id
            }, status=status.HTTP_200_OK)

    def _auto_approve_withdrawal(self, transaction_id: int, user_email: str, account_type: str):
        """Background thread: Auto approve after 5 seconds for Marketo users"""
        time.sleep(5)  # 5 second delay

        try:
            trans = WalletTransaction.objects.select_related('wallet__account__user').get(id=transaction_id)

            if trans.status != 'pending':
                logger.info(f"Transaction {transaction_id} already processed.")
                return

            # Auto approve
            trans.status = 'completed'
            trans.completed_at = timezone.now()
            trans.description = 'Auto-approved for Marketo user'
            trans.save()

            logger.info(f"Marketo withdrawal auto-approved: {trans.reference_id}")

            # Send emails with additional 5 second delay
            threading.Thread(
                target=self._send_delayed_emails,
                args=(trans, user_email, account_type),
                daemon=True
            ).start()

        except Exception as e:
            logger.error(f"Auto-approval failed for transaction {transaction_id}: {e}")

    def _send_delayed_emails(self, trans: WalletTransaction, user_email: str, account_type: str):
        """Send success emails after additional 5 seconds"""
        time.sleep(5)

        try:
            # User Success Email
            send_mail(
                subject="Withdrawal Completed Successfully",
                message=(
                    f"Hi {trans.wallet.account.user.username},\n\n"
                    f"Your withdrawal of ${trans.amount} USD has been successfully processed "
                    f"and sent to your M-Pesa.\n\n"
                    f"Amount: ${trans.amount} USD → {trans.converted_amount} KSH\n"
                    f"Reference: {trans.reference_id}\n"
                    f"Phone: {trans.mpesa_phone}\n\n"
                    f"Thank you for using TradeRiser!"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user_email],
                fail_silently=False,
            )

            # Admin Notification
            send_mail(
                subject="✅ Marketo Withdrawal Auto-Approved",
                message=(
                    f"Marketo User Withdrawal Auto-Approved\n\n"
                    f"User: {trans.wallet.account.user.username}\n"
                    f"Email: {user_email}\n"
                    f"Amount: ${trans.amount} USD → {trans.converted_amount} KSH\n"
                    f"Account: {account_type.title()}\n"
                    f"Reference: {trans.reference_id}\n"
                    f"Time: {timezone.now().strftime('%Y-%m-%d %H:%M %Z')}\n\n"
                    f"Status: COMPLETED (Auto)"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[ADMIN_EMAIL],
                fail_silently=False,
            )

        except Exception as e:
            logger.error(f"Failed to send delayed emails for {trans.reference_id}: {e}")

    def _send_admin_alert(self, trans: WalletTransaction, wallet):
        """Send alert for manual approval (non-marketo)"""
        try:
            send_mail(
                subject="Withdrawal Ready for Payout",
                message=(
                    f"User: {trans.wallet.account.user.username}\n"
                    f"Email: {trans.wallet.account.user.email}\n"
                    f"Amount: {trans.amount} USD → {trans.converted_amount} KSH\n"
                    f"Phone: {trans.mpesa_phone}\n"
                    f"Account: {wallet.account.account_type.title()}\n"
                    f"Reference: {trans.reference_id}\n"
                    f"Time: {timezone.now().strftime('%Y-%m-%d %H:%M %Z')}\n\n"
                    f"OTP verified. Funds deducted. Please process payout via M-Pesa."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[ADMIN_EMAIL],
                fail_silently=False,
            )
        except Exception as e:
            logger.error(f"Failed to send admin withdrawal alert: {e}")
class TransactionListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        transactions = WalletTransaction.objects.filter(
            wallet__account__user=request.user
        ).order_by('-created_at')
        serializer = WalletTransactionSerializer(transactions, many=True)
        return Response(serializer.data)


class MpesaCallbackView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        logger.info(f"Callback received: {request.data}")
        try:
            stk = request.data.get('Body', {}).get('stkCallback', {})
            if not stk:
                return JsonResponse({'ResultCode': 1, 'ResultDesc': 'Invalid payload'})

            checkout_id = stk['CheckoutRequestID']
            trans = WalletTransaction.objects.filter(checkout_request_id=checkout_id).first()
            if not trans:
                return JsonResponse({'ResultCode': 1, 'ResultDesc': 'Transaction not found'})

            user = trans.wallet.account.user

            if stk['ResultCode'] == 0:
                items = stk['CallbackMetadata']['Item']
                amount = next((item['Value'] for item in items if item['Name'] == 'Amount'), None)
                receipt = next((item['Value'] for item in items if item['Name'] == 'MpesaReceiptNumber'), None)

                trans.amount = Decimal(amount) if amount else trans.amount
                trans.description = f"Completed: {receipt}"
                trans.status = 'completed'
                trans.completed_at = timezone.now()
                trans.save()

                wallet = trans.wallet
                wallet.balance += trans.converted_amount
                wallet.save()

                Transaction.objects.create(
                    account=wallet.account,
                    amount=trans.converted_amount,
                    transaction_type='deposit',
                    description=f"Approved: {trans.reference_id}"
                )

                # User Success Email
                send_mail(
                    "Deposit Approved!",
                    f"Hi {user.username},\n\nYour deposit of KSh {trans.amount} has been approved.\n"
                    f"${trans.converted_amount} USD credited to your {wallet.account.account_type} account.\n"
                    f"Reference: {trans.reference_id}",
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False
                )

                # Admin Notification
                send_mail(
                    "Deposit Completed (Auto)",
                    f"User: {user.username}\nAmount: KSh {trans.amount} (${trans.converted_amount})\n"
                    f"Account: {wallet.account.account_type}\nRef: {trans.reference_id}",
                    settings.DEFAULT_FROM_EMAIL,
                    [ADMIN_EMAIL],
                    fail_silently=False
                )

            else:
                trans.status = 'failed'
                trans.description += f' | Failed: {stk["ResultDesc"]}'
                trans.save()

                send_mail(
                    "Deposit Failed",
                    f"Hi {user.username},\n\nYour deposit of KSh {trans.amount} failed: {stk['ResultDesc']}.\n"
                    f"Reference: {trans.reference_id}",
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False
                )

        except Exception as e:
            logger.error(f"Callback error: {e}")

        return JsonResponse({'ResultCode': 0})


class ResendOTPView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        transaction_id = request.data.get('transaction_id')
        if not transaction_id:
            return Response({'error': 'transaction_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            transaction_id = int(transaction_id)
            wallet_transaction = WalletTransaction.objects.get(
                id=transaction_id,
                wallet__account__user=request.user,
                status='pending'
            )
        except (ValueError, WalletTransaction.DoesNotExist):
            return Response({'error': 'Invalid or non-pending transaction'}, status=status.HTTP_400_BAD_REQUEST)

        otp_code = generate_otp()

        with transaction.atomic():
            OTPCode.objects.filter(transaction=wallet_transaction).delete()
            OTPCode.objects.create(
                user=request.user,
                code=otp_code,
                purpose='withdrawal',
                transaction=wallet_transaction,
                is_used=False
            )

        try:
            send_mail(
                subject="Withdrawal OTP (Resent)",
                message=(
                    f"Hi {request.user.username},\n\n"
                    f"Your new OTP for withdrawing {wallet_transaction.amount} USD "
                    f"from {wallet_transaction.wallet.account.account_type} account "
                    f"(Ref: {wallet_transaction.reference_id}) is: {otp_code}"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[request.user.email],
                fail_silently=False,
            )
        except Exception as e:
            logger.error(f"Failed to send resent OTP: {e}")
            return Response({'error': 'Failed to send OTP email'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'message': 'New OTP sent to your email.'}, status=status.HTTP_200_OK)


class InitiateTransferView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        amount = request.data.get('amount')
        sender_account_type = request.data.get('sender_account_type', 'standard').lower()
        recipient_email = request.data.get('recipient_email')
        recipient_account_type = request.data.get('recipient_account_type', 'standard').lower()

        ALLOWED_ACCOUNT_TYPES = {'standard', 'premium', 'business', 'pro-fx'}

        if sender_account_type not in ALLOWED_ACCOUNT_TYPES or recipient_account_type not in ALLOWED_ACCOUNT_TYPES:
            return Response({'error': 'Invalid account type'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(amount))
            if amount <= 0:
                return Response({'error': 'Amount must be greater than zero'}, status=status.HTTP_400_BAD_REQUEST)
        except (InvalidOperation, TypeError, ValueError):
            return Response({'error': 'Invalid amount format'}, status=status.HTTP_400_BAD_REQUEST)

        if not recipient_email:
            return Response({'error': 'Recipient email is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            recipient_user = User.objects.get(email__iexact=recipient_email.strip())
            if recipient_user == request.user:
                return Response({'error': 'Cannot transfer to yourself'}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'Recipient user not found'}, status=status.HTTP_404_NOT_FOUND)

        # ====================== WALLET VERIFIER CHECK ======================
        try:
            sender_account = Account.objects.get(
                user=request.user, 
                account_type=sender_account_type
            )
            if not sender_account.is_wallet_verified:
                return Response({
                    'error': 'Transfer failed please contact support'
                }, status=status.HTTP_400_BAD_REQUEST)
        except Account.DoesNotExist:
            return Response({'error': 'Account not found'}, status=status.HTTP_400_BAD_REQUEST)
        # ==================================================================

        # Get or create recipient account (no verifier check needed for recipient)
        recipient_account, _ = Account.objects.get_or_create(
            user=recipient_user, 
            account_type=recipient_account_type
        )

        reference_id = generate_transfer_reference()

        with transaction.atomic():
            sender_wallet = Wallet.objects.select_for_update().get(
                account=sender_account,
                wallet_type='main',
                currency__code='USD'
            )

            if sender_wallet.balance < amount:
                return Response({'error': 'Insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)

            recipient_wallet = Wallet.objects.get(
                account=recipient_account,
                wallet_type='main',
                currency__code='USD'
            )

            transfer_out = WalletTransaction.objects.create(
                wallet=sender_wallet,
                transaction_type='transfer_out',
                amount=amount,
                currency=sender_wallet.currency,
                status='pending',
                reference_id=reference_id,
                description=f"Transfer to {recipient_user.username} ({recipient_account_type})"
            )

            transfer_in = WalletTransaction.objects.create(
                wallet=recipient_wallet,
                transaction_type='transfer_in',
                amount=amount,
                currency=recipient_wallet.currency,
                converted_amount=amount,
                target_currency=recipient_wallet.currency,
                status='pending',
                reference_id=reference_id,
                description=f"Transfer from {request.user.username} ({sender_account_type})"
            )

            otp = OTPCode.objects.create(
                user=request.user,
                code=generate_otp(),
                purpose='transfer',
                transaction=transfer_out,
                expires_at=timezone.now() + timezone.timedelta(minutes=5)
            )

        # Send OTP
        try:
            send_mail(
                subject="Your Transfer OTP Code",
                message=(
                    f"Hi {request.user.username},\n\n"
                    f"Your OTP for transferring ${amount} USD (Ref: {reference_id}) is:\n\n"
                    f"{otp.code}\n\n"
                    f"This code expires in 5 minutes.\n"
                    f"If you didn't initiate this, contact support immediately.\n\n"
                    f"TradeRiser Team"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[request.user.email],
                fail_silently=False,
            )
        except Exception as e:
            logger.error(f"Failed to send transfer OTP: {e}")
            return Response({'error': 'Failed to send OTP'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'message': 'Transfer initiated. Check your email for OTP.',
            'transaction_id': transfer_out.id,
            'reference_id': reference_id,
            'amount': str(amount)
        }, status=status.HTTP_200_OK)


class VerifyTransferOTPView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        otp_code = request.data.get('otp')
        transaction_id = request.data.get('transaction_id')

        if not otp_code or not transaction_id:
            return Response({'error': 'OTP and transaction ID are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            transaction_id = int(transaction_id)
            transfer_out = WalletTransaction.objects.select_related('wallet__account__user').get(
                id=transaction_id,
                wallet__account__user=request.user,
                transaction_type='transfer_out',
                status='pending'
            )
            otp_obj = OTPCode.objects.get(
                user=request.user,
                purpose='transfer',
                transaction=transfer_out,
                code=otp_code,
                is_used=False
            )

            if otp_obj.is_expired():
                return Response({'error': 'OTP expired'}, status=status.HTTP_400_BAD_REQUEST)

        except (WalletTransaction.DoesNotExist, OTPCode.DoesNotExist):
            return Response({'error': 'Invalid or expired OTP'}, status=status.HTTP_400_BAD_REQUEST)

        reference_id = transfer_out.reference_id

        with transaction.atomic():
            transfer_in = WalletTransaction.objects.get(
                reference_id=reference_id,
                transaction_type='transfer_in'
            )

            transfer_out.status = 'completed'
            transfer_out.completed_at = timezone.now()
            transfer_out.save()

            transfer_in.status = 'completed'
            transfer_in.completed_at = timezone.now()
            transfer_in.save()

            otp_obj.is_used = True
            otp_obj.save()

        return Response({
            'message': 'Transfer completed successfully!',
            'reference_id': reference_id,
            'amount': str(transfer_out.amount)
        }, status=status.HTTP_200_OK)