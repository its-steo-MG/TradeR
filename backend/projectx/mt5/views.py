from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db import transaction
from decimal import Decimal

from accounts.models import Account
from wallet.models import Wallet, Currency
from dashboard.models import Transaction
from .models import MT5Position
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

        try:
            position = MT5Position.objects.create(
                user=request.user,
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
    """Close an MT5 position and credit/debit profit to the correct MT5 wallet"""
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

        # Get MT5 Account
        mt5_account = (
            Account.objects.filter(user=request.user, platform='mt5')
            .exclude(account_type='mt5-demo').first()
            or Account.objects.filter(user=request.user, platform='mt5').first()
        )

        if not mt5_account:
            return Response({"error": "No MT5 account found"}, status=status.HTTP_404_NOT_FOUND)

        usd = Currency.objects.get(code='USD')
        wallet = Wallet.objects.get(
            account=mt5_account, 
            wallet_type='main', 
            currency=usd
        )

        # Calculate profit
        close_price_val = Decimal(str(close_price)) if close_price is not None else position.current_price
        price_diff = (close_price_val - position.open_price) * (1 if position.side == 'buy' else -1)
        gross_profit = price_diff * position.volume * Decimal('100000')
        final_profit = gross_profit - position.swap - position.commission

        with transaction.atomic():
            old_balance = wallet.balance
            wallet.balance += final_profit
            wallet.save()

            # Record transaction
            Transaction.objects.create(
                account=mt5_account,
                amount=final_profit,
                transaction_type='profit' if final_profit > 0 else 'loss',
                description=f"MT5 Position Closed: {position.symbol} {position.side.upper()}"
            )

            # Delete position
            position.delete()

        return Response({
            "success": True,
            "message": "Position closed successfully",
            "final_profit": float(final_profit),
            "old_balance": float(old_balance),
            "new_balance": float(wallet.balance),
            "close_price": float(close_price_val)
        })