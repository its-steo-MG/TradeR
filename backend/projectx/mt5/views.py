from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db import transaction
from decimal import Decimal

from accounts.models import Account
from wallet.models import Wallet, Currency
from dashboard.models import Transaction
from .models import MT5Position
from .constants import get_contract_size
from .serializers import (
    MT5AccountCreateSerializer, 
    MT5AccountSerializer,
    MT5PositionSerializer
)


# ====================== MT5 ACCOUNT VIEWS ======================
class CreateMT5AccountView(APIView):
    """Create MT5 Real or Demo account"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = MT5AccountCreateSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Get the internal account type from serializer
        account_type = serializer.validated_data['internal_account_type']  # 'mt5-demo' or 'mt5'
        input_type = serializer.validated_data['account_type']            # original user input
        user = request.user

        # Double-check (extra safety)
        if user.accounts.filter(platform='mt5', account_type=account_type).exists():
            display_name = "Real" if input_type == "mt5" else "Demo"
            return Response({
                "error": f"You already have an MT5 {display_name} account."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                mt5_account = Account.objects.create(
                    user=user,
                    platform='mt5',
                    account_type=account_type,         # Now correctly 'mt5-demo' or 'mt5'
                    is_wallet_verified=True
                )

            display_name = "Real" if input_type == "mt5" else "Demo"
            return Response({
                "success": True,
                "message": f"MT5 {display_name} account created successfully.",
                "mt5_account": MT5AccountSerializer(mt5_account).data
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                "success": False, 
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MyMT5AccountsView(APIView):
    """List user's MT5 accounts + auto-create if none exist"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        mt5_accounts = Account.objects.filter(user=user, platform='mt5').order_by('-created_at')

        # Auto-create both MT5 accounts if user has none
        if not mt5_accounts.exists():
            with transaction.atomic():
                # MT5 Demo Account
                Account.objects.create(
                    user=user, 
                    platform='mt5', 
                    account_type='mt5-demo',      # Fixed
                    is_wallet_verified=True
                )
                # MT5 Real Account
                Account.objects.create(
                    user=user, 
                    platform='mt5', 
                    account_type='mt5', 
                    is_wallet_verified=True
                )
            mt5_accounts = Account.objects.filter(user=user, platform='mt5').order_by('-created_at')

        serializer = MT5AccountSerializer(mt5_accounts, many=True)
        return Response({
            "success": True,
            "mt5_accounts": serializer.data,
            "count": mt5_accounts.count()
        })


class SwitchMT5AccountView(APIView):
    """Switch active MT5 account"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        account_id = request.data.get('account_id')
        if not account_id:
            return Response({"error": "account_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            account = Account.objects.get(
                id=account_id, 
                user=request.user, 
                platform='mt5'
            )
        except Account.DoesNotExist:
            return Response({"error": "MT5 account not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = MT5AccountSerializer(account)
        return Response({
            "success": True,
            "message": "Switched to MT5 account successfully",
            "active_account": serializer.data
        })


# ====================== MT5 POSITION VIEWS ======================
class MT5PositionListView(APIView):
    """List all open MT5 positions for the current user"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        positions = MT5Position.objects.filter(user=request.user)
        serializer = MT5PositionSerializer(positions, many=True)
        
        return Response({
            "success": True,
            "positions": serializer.data,
            "count": positions.count()
        })


class MT5OpenPositionView(APIView):
    """Open a new MT5 position"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        data = request.data
        required_fields = ['symbol', 'side', 'volume', 'open_price']

        for field in required_fields:
            if field not in data:
                return Response({"error": f"{field} is required"}, status=status.HTTP_400_BAD_REQUEST)

        # NEW: figure out which MT5 account (real vs demo) this position
        # belongs to. The frontend already sends this — it was just being
        # dropped on the floor before.
        account_type = data.get('account_type', 'mt5-demo')
        if account_type not in ('mt5', 'mt5-demo'):
            return Response(
                {"error": "account_type must be 'mt5' or 'mt5-demo'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        account = Account.objects.filter(
            user=request.user, platform='mt5', account_type=account_type
        ).first()

        if not account:
            return Response(
                {"error": f"No MT5 account of type '{account_type}' found for this user."},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            position = MT5Position.objects.create(
                user=request.user,
                account=account,
                symbol=data['symbol'],
                side=data['side'],
                volume=Decimal(str(data['volume'])),
                open_price=Decimal(str(data['open_price'])),
                current_price=Decimal(str(data.get('current_price', data['open_price']))),
                swap=Decimal(str(data.get('swap', 0))),
                commission=Decimal(str(data.get('commission', 0))),
                sl=Decimal(str(data['sl'])) if data.get('sl') else None,
                tp=Decimal(str(data['tp'])) if data.get('tp') else None,
            )

            serializer = MT5PositionSerializer(position)
            return Response({
                "success": True,
                "message": "MT5 Position opened successfully",
                "position": serializer.data
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                "success": False, 
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MT5ClosePositionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        position_id = request.data.get('position_id')
        close_price = request.data.get('close_price')

        if not position_id:
            return Response({"error": "position_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            position = MT5Position.objects.get(id=position_id, user=request.user)
        except MT5Position.DoesNotExist:
            return Response({"error": "Position not found"}, status=status.HTTP_404_NOT_FOUND)

        # FIXED: use the account the position was actually opened on.
        # No more guessing / falling back to "first mt5 account found".
        account = position.account
        if not account:
            # Backfill safety net for positions created before this field
            # existed. Remove this fallback once you've backfilled old rows
            # (see migration note).
            account = Account.objects.filter(user=request.user, platform='mt5').first()

        if not account:
            return Response({"error": "MT5 account not found"}, status=status.HTTP_404_NOT_FOUND)

        usd = Currency.objects.get(code='USD')
        wallet = Wallet.objects.get(account=account, wallet_type='main', currency=usd)

        # MATCH FRONTEND calcProfit EXACTLY
        close_price_val = Decimal(str(close_price)) if close_price is not None else position.current_price
        dir_multiplier = Decimal('1') if position.side == 'buy' else Decimal('-1')
        price_diff = (close_price_val - position.open_price) * dir_multiplier

        # FIXED: per-symbol contract size instead of a hardcoded 100,000.
        # Gold/silver etc. now match the frontend's SYMBOLS table exactly.
        contract_size = get_contract_size(position.symbol)
        gross_profit = price_diff * position.volume * contract_size

        # JPY adjustment
        if position.symbol.endswith('JPY'):
            gross_profit = gross_profit / close_price_val

        final_profit = gross_profit - position.swap - position.commission

        # NOTE: the old "-100 max loss" cap was REMOVED. It made the backend
        # deduct a different amount than the frontend displayed, which is
        # exactly the kind of wallet mismatch we're fixing here. The real
        # calculated loss is now applied — but clamped so the wallet can
        # NEVER go below zero (see below).

        with transaction.atomic():
            # Lock the wallet row so concurrent closes (e.g. EA "close all")
            # can't race each other into a negative balance.
            wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)
            old_balance = wallet.balance

            # ================== BLOWN ACCOUNT PROTECTION ==================
            # If the loss is bigger than what's left in the wallet, only
            # deduct what the wallet actually has and reset the balance to
            # exactly 0.00 — NEVER negative. This mirrors the frontend's
            # blow-account behaviour (close everything, balance = 0).
            applied_profit = final_profit
            if final_profit < 0 and (old_balance + final_profit) < Decimal('0'):
                applied_profit = -old_balance  # deduct everything that's left

            wallet.balance = old_balance + applied_profit
            if wallet.balance < Decimal('0'):
                wallet.balance = Decimal('0.00')  # hard safety net
            wallet.save()

            Transaction.objects.create(
                account=account,
                amount=applied_profit,
                transaction_type='profit' if applied_profit > 0 else 'loss',
                description=f"MT5 Closed: {position.symbol}"
            )

            position.delete()

        return Response({
            "success": True,
            "message": "Position closed successfully",
            "final_profit": float(final_profit),      # real calculated P/L
            "applied_profit": float(applied_profit),  # what actually hit the wallet
            "old_balance": float(old_balance),
            "new_balance": float(wallet.balance),     # never negative
        })
