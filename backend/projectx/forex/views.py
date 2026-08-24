import random
from decimal import Decimal
import logging
import time
import threading
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, generics
from django.db import transaction
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from rest_framework.pagination import PageNumberPagination
from rest_framework import generics

from .models import ForexPair, Position, ForexTrade, ForexRobot, UserRobot, BotLog
from .serializers import (
    ForexPairSerializer, 
    PositionSerializer, 
    ForexTradeSerializer, 
    ForexRobotSerializer, 
    UserRobotSerializer, 
    BotLogSerializer
)
from accounts.models import Account
from wallet.models import Wallet, Currency
from dashboard.models import Transaction

logger = logging.getLogger(__name__)


# ====================== HELPER FUNCTION ======================
def get_trading_account(user):
    """Respect the user's active account (Pro-FX or MT5)"""
    # Try to get active Pro-FX first
    profx_account = user.accounts.filter(account_type='pro-fx').first()
    if profx_account:
        return profx_account

    # Then MT5
    mt5_account = user.accounts.filter(platform='mt5').first()
    if mt5_account:
        return mt5_account

    return user.accounts.first()


# ====================== PAIRS ======================
class ForexPairListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        account = get_trading_account(request.user)
        if not account:
            return Response({'error': 'No trading account found'}, status=status.HTTP_403_FORBIDDEN)

        pairs = ForexPair.objects.all()
        serializer = ForexPairSerializer(pairs, many=True)
        return Response({'pairs': serializer.data})


# ====================== PLACE ORDER ======================
class PlaceOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        account = get_trading_account(request.user)
        if not account:
            return Response({'error': 'No trading account found (Pro-FX or MT5)'}, status=status.HTTP_403_FORBIDDEN)

        pair_id = request.data.get('pair_id')
        direction = request.data.get('direction')
        volume_lots = Decimal(request.data.get('volume_lots', '0.01'))
        sl = request.data.get('sl')
        tp = request.data.get('tp')
        time_frame = request.data.get('time_frame', 'M1')

        try:
            pair = ForexPair.objects.get(id=pair_id)

            entry_price = pair.get_current_price(time_frame=time_frame)
            if entry_price <= 0:
                return Response({'error': 'Failed to generate price'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            margin = (volume_lots * pair.contract_size * entry_price) / 500
            usd = Currency.objects.get(code='USD')
            wallet = Wallet.objects.get(account=account, wallet_type='main', currency=usd)

            if wallet.balance < margin:
                return Response({'error': 'Insufficient balance for margin'}, status=status.HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                position = Position.objects.create(
                    user=request.user,
                    account=account,
                    pair=pair,
                    direction=direction,
                    volume_lots=volume_lots,
                    entry_price=entry_price,
                    sl=sl,
                    tp=tp,
                    floating_p_l=Decimal('0.00'),
                    status='open',
                    leverage=500,
                    time_frame=time_frame
                )

                wallet.balance -= margin
                wallet.save()

                Transaction.objects.create(
                    account=account,
                    amount=-margin,
                    transaction_type='margin_lock',
                    description=f'Forex open: {pair.name}'
                )

            serializer = PositionSerializer(position)
            return Response({'position': serializer.data}, status=status.HTTP_201_CREATED)

        except ForexPair.DoesNotExist:
            return Response({'error': 'Pair not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ====================== POSITIONS ======================
class PositionListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        account = get_trading_account(request.user)
        if not account:
            return Response({'error': 'No trading account found'}, status=status.HTTP_403_FORBIDDEN)

        positions = Position.objects.filter(user=request.user, account=account, status='open')
        for pos in positions:
            current_price = pos.pair.get_current_price()
            pos.update_floating_p_l(current_price)

        serializer = PositionSerializer(positions, many=True)
        return Response({'positions': serializer.data})


class ClosePositionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, position_id):
        try:
            position = Position.objects.get(id=position_id, user=request.user, status='open')
            current_price = position.pair.get_current_price(
                position.entry_time,
                is_sashi=request.user.is_sashi,
                direction=position.direction
            )
            position.close_position(current_price, is_auto=False, close_reason='manual')
            return Response({'message': 'Position closed successfully'}, status=status.HTTP_200_OK)
        except Position.DoesNotExist:
            return Response({'error': 'Position not found or already closed'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"ClosePositionView error: {str(e)}")
            return Response({'error': 'Failed to close position'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CloseAllPositionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        account = get_trading_account(request.user)
        positions = Position.objects.filter(user=request.user, account=account, status='open')

        if not positions.exists():
            return Response({'message': 'No open positions to close'}, status=status.HTTP_200_OK)

        closed_count = 0
        for position in positions:
            try:
                current_price = position.pair.get_current_price(
                    position.entry_time,
                    is_sashi=request.user.is_sashi,
                    direction=position.direction
                )
                position.close_position(current_price, is_auto=False, close_reason='manual')
                closed_count += 1
            except Exception as e:
                logger.error(f"Failed to close position {position.id}: {e}")

        return Response({'message': f'{closed_count} positions closed successfully'}, status=status.HTTP_200_OK)


# ====================== EA POSITIONS ======================
class CloseEAPositionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_robot_id):
        try:
            user_robot = UserRobot.objects.get(id=user_robot_id, user=request.user)
            if not user_robot.is_ea:
                return Response({'error': 'This robot is not an EA'}, status=status.HTTP_400_BAD_REQUEST)

            closed_count = user_robot.close_all_positions()
            return Response({
                'success': True,
                'message': f'Successfully closed {closed_count} position(s)',
                'closed_count': closed_count
            }, status=status.HTTP_200_OK)
        except UserRobot.DoesNotExist:
            return Response({'error': 'Robot not found'}, status=status.HTTP_404_NOT_FOUND)


# ====================== HISTORY ======================
class StandardResultsSetPagination(PageNumberPagination):
    page_size = 50          # Show 50 records per page
    page_size_query_param = 'page_size'
    max_page_size = 200


class ForexTradeHistoryView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ForexTradeSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        account = get_trading_account(self.request.user)
        if not account:
            return ForexTrade.objects.none()

        return ForexTrade.objects.filter(
            position__user=self.request.user,
            position__account=account
        ).select_related(
            'position', 
            'position__pair', 
            'position__user'
        ).order_by('-close_time')


# ====================== PRICES ======================
class CurrentPriceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pair_id):
        try:
            pair = ForexPair.objects.get(id=pair_id)
            price = pair.get_current_price()
            return Response({'current_price': float(price)})
        except ForexPair.DoesNotExist:
            return Response({'error': 'Pair not found'}, status=status.HTTP_404_NOT_FOUND)


class CurrentPricesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @method_decorator(cache_page(1))
    def get(self, request):
        ids_str = request.query_params.get('ids', '')
        if not ids_str:
            return Response({'error': 'ids parameter required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pair_ids = [int(id.strip()) for id in ids_str.split(',') if id.strip().isdigit()]
            pairs = ForexPair.objects.filter(id__in=pair_ids)
            prices = {pair.id: float(pair.get_current_price()) for pair in pairs}
            return Response({'prices': prices})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ====================== ROBOTS ======================
class ForexRobotListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Always return all active robots (including EA).
        EA purchase/run still require MT5 (enforced in PurchaseRobotView / ToggleRobotView).
        Optional: ?ea_only=1 to return only EA robots.
        """
        queryset = ForexRobot.objects.filter(is_active=True)

        ea_only = str(request.query_params.get("ea_only", "")).lower() in ("1", "true", "yes")
        if ea_only:
            queryset = queryset.filter(is_ea=True)

        serializer = ForexRobotSerializer(queryset, many=True)
        return Response({"robots": serializer.data})

class PurchaseRobotView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, robot_id):
        """
        Purchase a forex robot.

        - EA robots: ALWAYS charged against the user's MT5 wallet
          (real preferred, then demo). Pro-FX balance is never used.
        - Non-EA robots: use the normal trading account helper (Pro-FX first).
        """
        try:
            robot = ForexRobot.objects.get(id=robot_id, is_active=True)
        except ForexRobot.DoesNotExist:
            return Response({'error': 'Robot not found or inactive'}, status=status.HTTP_404_NOT_FOUND)

        if UserRobot.objects.filter(user=request.user, robot=robot).exists():
            return Response({'error': 'You already own this robot'}, status=status.HTTP_400_BAD_REQUEST)

        # ── Resolve which account / wallet to charge ──
        if robot.is_ea:
            # Optional client hint: 'mt5' (real) or 'mt5-demo'
            requested_type = request.data.get('account_type')  # e.g. 'mt5' | 'mt5-demo'

            mt5_qs = request.user.accounts.filter(platform='mt5')
            if requested_type in ('mt5', 'mt5-demo'):
                account = mt5_qs.filter(account_type=requested_type).first()
                if not account:
                    label = 'Real' if requested_type == 'mt5' else 'Demo'
                    return Response(
                        {'error': f'No MT5 {label} account found. Create one before purchasing an EA.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            else:
                # Prefer real MT5, fall back to any MT5 account
                account = (
                    mt5_qs.filter(account_type='mt5').first()
                    or mt5_qs.first()
                )
                if not account:
                    return Response(
                        {
                            'error': (
                                'EA robots must be purchased with an MT5 wallet. '
                                'Please create an MT5 account first.'
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
        else:
            account = get_trading_account(request.user)
            if not account:
                return Response({'error': 'No trading account found'}, status=status.HTTP_403_FORBIDDEN)

        usd = Currency.objects.get(code='USD')
        try:
            wallet = Wallet.objects.get(account=account, wallet_type='main', currency=usd)
        except Wallet.DoesNotExist:
            return Response(
                {'error': 'Wallet not found for the selected account'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        effective_price = robot.effective_price

        if wallet.balance < effective_price:
            wallet_label = 'MT5' if robot.is_ea else account.account_type
            return Response(
                {
                    'error': (
                        f'Insufficient {wallet_label} balance. '
                        f'Need ${effective_price}, have ${wallet.balance}'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            wallet.balance -= effective_price
            wallet.save()

            user_robot = UserRobot.objects.create(
                user=request.user,
                robot=robot,
                stake_per_trade=robot.stake_per_trade,
                is_ea=robot.is_ea,
                max_open_positions=robot.max_open_positions,
            )

            Transaction.objects.create(
                account=account,
                amount=-effective_price,
                transaction_type='withdrawal',
                description=f'Purchased robot: {robot.name}' + (' (EA / MT5 wallet)' if robot.is_ea else ''),
            )

        return Response({
            'message': 'Robot purchased successfully',
            'charged_from': 'mt5' if robot.is_ea else account.account_type,
            'account_id': account.id,
            'remaining_balance': str(wallet.balance),
            'user_robot': UserRobotSerializer(user_robot).data,
        }, status=status.HTTP_201_CREATED)


class MyRobotsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_robots = UserRobot.objects.filter(user=request.user)
        serializer = UserRobotSerializer(user_robots, many=True)
        return Response({'user_robots': serializer.data})


# ====================== TOGGLE ROBOT ======================
class ToggleRobotView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_robot_id):
        try:
            user_robot = UserRobot.objects.get(id=user_robot_id, user=request.user)
        except UserRobot.DoesNotExist:
            return Response({'error': 'Robot not found'}, status=status.HTTP_404_NOT_FOUND)

        account = get_trading_account(request.user)

        # Block starting EA on non-MT5
        if user_robot.is_ea and account.platform != 'mt5':
            return Response({'error': 'EA Robots can only run on MT5 accounts'}, status=status.HTTP_400_BAD_REQUEST)

        payload = request.data
        if 'stake' in payload:
            user_robot.stake_per_trade = Decimal(str(payload['stake']))
        if 'pair_id' in payload:
            user_robot.selected_pair_id = payload['pair_id']
        if 'timeframe' in payload:
            user_robot.timeframe = payload['timeframe']

        is_ea = user_robot.is_ea
        user_robot.is_running = not user_robot.is_running
        user_robot.save(update_fields=['is_running', 'stake_per_trade', 'selected_pair', 'timeframe'])

        closed_count = 0

        if user_robot.is_running:
            if is_ea:
                BotLog.objects.create(user_robot=user_robot, message="🚀 EA Bot Activated")
            else:
                perform_robot_trade(user_robot)
                threading.Thread(target=recurring_trade_loop, args=(user_robot.id,), daemon=True).start()

            message = "Robot started successfully"
        else:
            if is_ea:
                time.sleep(0.3)
                closed_count = user_robot.close_all_positions()
                BotLog.objects.create(
                    user_robot=user_robot,
                    message=f"⛔ EA Bot Stopped - Closed {closed_count} positions"
                )
                message = f"EA stopped and {closed_count} positions closed"
            else:
                message = "Robot stopped successfully"

        return Response({
            'is_running': user_robot.is_running,
            'message': message,
            'is_ea': is_ea,
            'closed_positions': closed_count
        })


# ====================== HELPER FUNCTIONS ======================
def recurring_trade_loop(user_robot_id):
    while True:
        try:
            user_robot = UserRobot.objects.get(id=user_robot_id)
            if not user_robot.is_running:
                break
            perform_robot_trade(user_robot)
            time.sleep(10)
        except UserRobot.DoesNotExist:
            break
        except Exception as e:
            logger.error(f"Error in trade loop: {e}")
            time.sleep(10)


def perform_robot_trade(user_robot):
    try:
        robot = user_robot.robot
        user = user_robot.user
        is_sashi = getattr(user, 'is_sashi', False)
        win_rate = robot.win_rate_sashi if is_sashi else robot.win_rate_normal

        stake = user_robot.stake_per_trade
        account = get_trading_account(user)
        if not account:
            return

        usd = Currency.objects.get(code='USD')
        wallet = Wallet.objects.get(account=account, wallet_type='main', currency=usd)

        if wallet.balance < stake:
            BotLog.objects.create(user_robot=user_robot, message="Insufficient balance. Stopping.")
            user_robot.is_running = False
            user_robot.save()
            return

        wallet.balance -= stake
        wallet.save()

        time.sleep(random.uniform(1, 3))

        is_win = random.random() * 100 < win_rate
        profit = (stake * robot.profit_multiplier) if is_win else -stake

        wallet.balance += stake + profit
        wallet.save()

        result = "WIN" if is_win else "LOSS"
        BotLog.objects.create(
            user_robot=user_robot,
            message=f"Trade {result}! Profit: ${profit:+.2f}",
            trade_result=result.lower(),
            profit_loss=profit
        )

        Transaction.objects.create(
            account=account,
            amount=profit,
            transaction_type='profit' if profit > 0 else 'loss',
            description=f'Robot trade: {robot.name}'
        )

        user_robot.last_trade_time = timezone.now()
        user_robot.save()

    except Exception as e:
        BotLog.objects.create(user_robot=user_robot, message=f"Error: {str(e)}")


class BotLogListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BotLogSerializer

    def get_queryset(self):
        queryset = BotLog.objects.filter(
            user_robot__user=self.request.user
        ).select_related('user_robot', 'user_robot__robot').order_by('-timestamp')

        user_robot_id = self.request.query_params.get('user_robot_id')
        if user_robot_id:
            try:
                queryset = queryset.filter(user_robot_id=int(user_robot_id))
            except ValueError:
                pass
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        with transaction.atomic():
            response = Response(serializer.data)
            queryset.delete()
        return response
    

class CreditWalletOnCloseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            realized_profit = Decimal(str(request.data.get('realized_profit', 0)))
            symbol = request.data.get('symbol')
            volume = request.data.get('volume')
            side = request.data.get('side')

            account = get_trading_account(request.user)
            if not account:
                return Response({'error': 'No trading account found'}, status=status.HTTP_400_BAD_REQUEST)

            usd = Currency.objects.get(code='USD')
            wallet = Wallet.objects.get(account=account, wallet_type='main', currency=usd)

            with transaction.atomic():
                wallet.balance += realized_profit
                wallet.save()

                Transaction.objects.create(
                    account=account,
                    amount=realized_profit,
                    transaction_type='profit' if realized_profit > 0 else 'loss',
                    description=f'Closed local position: {symbol} {side} {volume} lots'
                )

            return Response({
                'message': 'Wallet updated successfully',
                'new_balance': float(wallet.balance)
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"CreditWalletOnCloseView error: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)