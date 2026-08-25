from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.generics import ListAPIView
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from .models import EquityAccount, EquityTransaction, EquityNotification
from .serializers import (
    EquityAccountSerializer, EquityTransactionSerializer,
    EquityNotificationSerializer, AdminAdjustBalanceSerializer
)
from .signals import format_equity_received_message, mask_account
import logging

logger = logging.getLogger(__name__)


class EquityHomeView(APIView):
    """Main home screen data (matches the Equity app UI)"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        accounts = EquityAccount.objects.filter(user=request.user, is_active=True)
        primary = accounts.filter(is_primary=True).first() or accounts.first()

        data = {
            "greeting": f"Good evening, {request.user.get_full_name() or request.user.username}",
            "primary_account": EquityAccountSerializer(primary).data if primary else None,
            "accounts": EquityAccountSerializer(accounts, many=True).data,
            "total_balance": sum(a.balance for a in accounts),
            "quick_actions": [
                {"id": "send_money", "label": "Send money"},
                {"id": "pay_with_equity", "label": "Pay with Equity"},
                {"id": "buy_airtime", "label": "Buy Airtime"},
            ]
        }
        return Response(data)


class EquityAccountsView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = EquityAccountSerializer

    def get_queryset(self):
        return EquityAccount.objects.filter(user=self.request.user, is_active=True)


class EquityTransactionsView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = EquityTransactionSerializer

    def get_queryset(self):
        account_id = self.request.query_params.get('account_id')
        qs = EquityTransaction.objects.filter(account__user=self.request.user)
        if account_id:
            qs = qs.filter(account_id=account_id)
        return qs[:50]


class EquityNotificationsView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = EquityNotificationSerializer

    def get_queryset(self):
        return EquityNotification.objects.filter(user=self.request.user)[:30]


class MarkNotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            notif = EquityNotification.objects.get(pk=pk, user=request.user)
            notif.is_read = True
            notif.save(update_fields=['is_read'])
            return Response({"message": "Marked as read"})
        except EquityNotification.DoesNotExist:
            return Response({"error": "Not found"}, status=404)


# ========== ADMIN ONLY ==========
class AdminAdjustBalanceView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        serializer = AdminAdjustBalanceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        account_id = serializer.validated_data['account_id']
        amount = serializer.validated_data['amount']
        reason = serializer.validated_data.get('reason', 'Admin adjustment')

        try:
            with transaction.atomic():
                account = EquityAccount.objects.select_for_update().get(id=account_id)
                account.balance += amount

                if account.balance < 0:
                    return Response({"error": "Balance cannot go negative"}, status=400)

                account.save(update_fields=['balance'])

                # Create transaction first so we get a real reference
                tx = EquityTransaction.objects.create(
                    account=account,
                    amount=amount,
                    transaction_type='admin_adjustment',
                    description=reason,
                    balance_after=account.balance
                )

                # ===== Exact Equity Bank style message =====
                if amount > 0:
                    message_body = format_equity_received_message(
                        amount=amount,
                        sender_name="EQUITY BANK",
                        sender_account="000000000000",                 # bank side
                        receiver_account=account.account_number,       # ← REAL user account
                        reference=tx.reference,
                        when=timezone.localtime()
                    )
                    title = "Money Received"
                else:
                    message_body = (
                        f"Your Equity account {mask_account(account.account_number)} "
                        f"was debited {abs(amount):,.2f} KES. "
                        f"New balance: {account.balance:,.2f} KES. "
                        f"Ref. {tx.reference} on {timezone.localtime().strftime('%d %b %Y at %H:%M')} EAT."
                    )
                    title = "Account Debited"

                EquityNotification.objects.create(
                    user=account.user,
                    title=title,
                    body=message_body,
                    data={
                        "type": "admin_adjustment",
                        "account_id": account.id,
                        "reference": tx.reference,
                        "amount": str(amount),
                        "masked_receiver": mask_account(account.account_number),
                    }
                )

            return Response({
                "message": "Balance updated successfully",
                "new_balance": str(account.balance),
                "reference": tx.reference,
                "notification": message_body
            })

        except EquityAccount.DoesNotExist:
            return Response({"error": "Account not found"}, status=404)