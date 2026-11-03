from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.generics import ListAPIView
from django.db import transaction
from django.utils import timezone
from decimal import Decimal, InvalidOperation
from .models import BinanceWallet, BinanceTransaction, BinanceNotification
from .serializers import (
    BinanceWalletSerializer, BinanceTransactionSerializer,
    BinanceNotificationSerializer, AdminAdjustBinanceBalanceSerializer
)
from .signals import format_binance_received_message, mask_address
from .trade_emails import notify_trade_success
import logging
import threading
import random

logger = logging.getLogger(__name__)

# Sender names and numbers for M-Pesa messages based on sell amount
MPESA_SENDERS = {
    "small": [  # < 500 USDT
        {"name": "Mzizi Payments", "phone": "4166139"},
        {"name": "QuickCash Ltd", "phone": "5238914"},
        {"name": "SwiftPay Kenya", "phone": "3872156"},
        {"name": "EasySend Co", "phone": "6129843"},
        {"name": "FastTransfer", "phone": "4593271"},
    ],
    "medium": [  # 500 to 1000 USDT
        {"name": "Prime Remit", "phone": "7284519"},
        {"name": "GlobalPay KE", "phone": "8346720"},
        {"name": "TrustedSend", "phone": "5913847"},
        {"name": "SecureCash", "phone": "6729105"},
        {"name": "DirectPay Ltd", "phone": "8152634"},
    ],
    "large": [  # 1000+ USDT
        {"name": "Capital Exchange", "phone": "9347812"},
        {"name": "Elite Remittance", "phone": "8472916"},
        {"name": "MajorPay Services", "phone": "7635481"},
        {"name": "Summit Transfers", "phone": "6928174"},
        {"name": "Apex Payments", "phone": "5819643"},
    ],
}


def get_mpesa_sender(usdt_amount):
    """Pick a random sender name/phone based on USDT amount."""
    if usdt_amount < 500:
        pool = MPESA_SENDERS["small"]
    elif usdt_amount < 1000:
        pool = MPESA_SENDERS["medium"]
    else:
        pool = MPESA_SENDERS["large"]
    return random.choice(pool)


def _dec(v):
    try:
        return Decimal(str(v))
    except (InvalidOperation, TypeError):
        return None


class BinanceHomeView(APIView):
    """Main home screen data for the Binance app"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        wallets = BinanceWallet.objects.filter(user=request.user, is_active=True)
        primary = wallets.filter(is_primary=True).first() or wallets.first()

        data = {
            "greeting": f"Hello, {request.user.get_full_name() or request.user.username}",
            "primary_wallet": BinanceWalletSerializer(primary).data if primary else None,
            "wallets": BinanceWalletSerializer(wallets, many=True).data,
            "total_balance": sum(w.balance for w in wallets),
            "currency": "USDT",
        }
        return Response(data)


class BinanceWalletsView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BinanceWalletSerializer

    def get_queryset(self):
        return BinanceWallet.objects.filter(user=self.request.user, is_active=True)


class BinanceTransactionsView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BinanceTransactionSerializer

    def get_queryset(self):
        wallet_id = self.request.query_params.get('wallet_id')
        qs = BinanceTransaction.objects.filter(wallet__user=self.request.user)
        if wallet_id:
            qs = qs.filter(wallet_id=wallet_id)
        return qs[:50]


class BinanceNotificationsView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BinanceNotificationSerializer

    def get_queryset(self):
        return BinanceNotification.objects.filter(user=self.request.user)[:30]


class MarkBinanceNotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            notif = BinanceNotification.objects.get(pk=pk, user=request.user)
            notif.is_read = True
            notif.save(update_fields=['is_read'])
            return Response({"message": "Marked as read"})
        except BinanceNotification.DoesNotExist:
            return Response({"error": "Not found"}, status=404)


class AdminAdjustBinanceBalanceView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        serializer = AdminAdjustBinanceBalanceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        wallet_id = serializer.validated_data['wallet_id']
        amount = serializer.validated_data['amount']
        reason = serializer.validated_data.get('reason', 'Admin adjustment')

        try:
            with transaction.atomic():
                wallet = BinanceWallet.objects.select_for_update().get(id=wallet_id)
                wallet.balance += amount

                if wallet.balance < 0:
                    return Response({"error": "Balance cannot go negative"}, status=400)

                wallet.save(update_fields=['balance'])

                tx = BinanceTransaction.objects.create(
                    wallet=wallet,
                    amount=amount,
                    transaction_type='admin_adjustment',
                    description=reason,
                    balance_after=wallet.balance
                )

                if amount > 0:
                    message_body = format_binance_received_message(
                        amount=amount,
                        sender_name="BINANCE",
                        sender_address="0xBinanceHotWallet",
                        receiver_address=wallet.address,
                        reference=tx.reference,
                        network=wallet.network,
                        currency=wallet.currency,
                        when=timezone.localtime()
                    )
                    title = "USDT Received"
                else:
                    message_body = (
                        f"Your Binance wallet {mask_address(wallet.address)} "
                        f"was debited {abs(amount):,.2f} {wallet.currency}. "
                        f"New balance: {wallet.balance:,.2f} {wallet.currency}. "
                        f"Ref. {tx.reference} on {timezone.localtime().strftime('%d %b %Y at %H:%M')} EAT."
                    )
                    title = "Wallet Debited"

                BinanceNotification.objects.create(
                    user=wallet.user,
                    title=title,
                    body=message_body,
                    data={
                        "type": "admin_adjustment",
                        "wallet_id": wallet.id,
                        "reference": tx.reference,
                        "amount": str(amount),
                        "masked_receiver": mask_address(wallet.address),
                    }
                )

            return Response({
                "message": "Balance updated successfully",
                "new_balance": str(wallet.balance),
                "reference": tx.reference,
                "notification": message_body
            })

        except BinanceWallet.DoesNotExist:
            return Response({"error": "Wallet not found"}, status=404)


class BinanceSellView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        amount = _dec(request.data.get("amount"))
        kes = _dec(request.data.get("kes_amount"))
        phone = str(request.data.get("phone", ""))
        fee = _dec(request.data.get("fee_kes", "0")) or Decimal("0")
        rate = request.data.get("rate", "0")
        if not amount or amount <= 0 or not kes or kes <= 0 or len(phone) < 12:
            return Response({"detail": "Invalid sell request"}, status=400)
        with transaction.atomic():
            try:
                wallet = BinanceWallet.objects.select_for_update().get(
                    id=request.data.get("wallet_id"), user=request.user
                )
            except BinanceWallet.DoesNotExist:
                return Response({"detail": "Wallet not found"}, status=404)
            if wallet.balance < amount:
                return Response({"detail": "Insufficient balance"}, status=400)
            wallet.balance -= amount
            wallet.save(update_fields=["balance"])
            tx = BinanceTransaction.objects.create(
                wallet=wallet,
                amount=-amount,
                transaction_type="debit",
                description=f"Sell {amount} USDT to M-PESA ****{phone[-4:]} for {kes:,.0f} KES",
                balance_after=wallet.balance,
            )

            # Processing notification only (no email yet)
            BinanceNotification.objects.create(
                user=request.user,
                title="Sell Processing",
                body=f"Your sell of {amount} USDT is being processed.",
                data={"type": "sell", "status": "processing", "reference": tx.reference},
            )

            # Send success email only after processing window
            def _send_success():
                try:
                    notify_trade_success(
                        request.user,
                        "sell",
                        crypto_amount=amount,
                        fiat_amount=kes,
                        rate=rate,
                        fee=fee,
                        reference=tx.reference,
                        when=timezone.now(),
                    )
                    # Create M-Pesa transaction + message
                    try:
                        from mpesa_simulator.models import MpesaUser, MpesaTransaction
                        mpesa_user = MpesaUser.objects.filter(user=request.user).first()
                        if mpesa_user:
                            sender = get_mpesa_sender(float(amount))
                            mpesa_user.balance += kes
                            mpesa_user.save(update_fields=["balance"])
                            MpesaTransaction.objects.create(
                                mpesa_user=mpesa_user,
                                transaction_type="deposit",
                                amount=kes,
                                description=f"Received from {sender['name']}",
                                recipient_name=sender["name"],
                                recipient_phone=sender["phone"],
                                category="business",
                            )
                            # Push notification for M-Pesa app
                            try:
                                from notifications.utils import send_web_push
                                send_web_push(
                                    user=request.user,
                                    title="MPESA",
                                    body=(
                                        f"You have received Ksh{kes:,.2f} from {sender['name']} {sender['phone']}. "
                                        f"New M-PESA balance is Ksh{mpesa_user.balance:,.2f}."
                                    ),
                                    data={"type": "mpesa_received", "amount": str(kes)},
                                )
                            except Exception as push_err:
                                logger.error(f"M-Pesa push failed: {push_err}")
                    except Exception as mpesa_err:
                        logger.error(f"M-Pesa sell message failed: {mpesa_err}")
                except Exception as e:
                    logger.error(f"Delayed sell success email failed: {e}")

            threading.Timer(20.0, _send_success).start()

        return Response({
            "reference": tx.reference,
            "balance_after": str(wallet.balance),
            "status": "processing"
        })


class BinanceBuyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        amount = _dec(request.data.get("amount"))
        kes = _dec(request.data.get("kes_amount"))
        fee = _dec(request.data.get("fee_kes", "0")) or Decimal("0")
        rate = request.data.get("rate", "0")
        if not amount or amount <= 0 or not kes or kes <= 0:
            return Response({"detail": "Invalid buy request"}, status=400)
        with transaction.atomic():
            try:
                wallet = BinanceWallet.objects.select_for_update().get(
                    id=request.data.get("wallet_id"), user=request.user
                )
            except BinanceWallet.DoesNotExist:
                return Response({"detail": "Wallet not found"}, status=404)
            wallet.balance += amount
            wallet.save(update_fields=["balance"])
            tx = BinanceTransaction.objects.create(
                wallet=wallet,
                amount=amount,
                transaction_type="credit",
                description=f"Buy {amount} USDT with {kes:,.0f} KES via M-PESA",
                balance_after=wallet.balance,
            )

            # Processing notification only (no email yet)
            BinanceNotification.objects.create(
                user=request.user,
                title="Buy Processing",
                body=f"Your purchase of {amount} USDT is being processed.",
                data={"type": "buy", "status": "processing", "reference": tx.reference},
            )

            # Send success email only after processing window
            def _send_success():
                try:
                    notify_trade_success(
                        request.user,
                        "buy",
                        crypto_amount=amount,
                        fiat_amount=kes,
                        rate=rate,
                        fee=fee,
                        reference=tx.reference,
                        when=timezone.now(),
                    )
                except Exception as e:
                    logger.error(f"Delayed buy success email failed: {e}")

            threading.Timer(20.0, _send_success).start()

        return Response({
            "reference": tx.reference,
            "balance_after": str(wallet.balance),
            "status": "processing",
            "amount": str(amount)
        })
