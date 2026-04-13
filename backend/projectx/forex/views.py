# forex/views.py
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


class ForexPairListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.accounts.filter(account_type='pro-fx').exists():
            return Response({'error': 'Pro-FX account required'}, status=status.HTTP_403_FORBIDDEN)
        pairs = ForexPair.objects.all()
        serializer = ForexPairSerializer(pairs, many=True)
        return Response({'pairs': serializer.data})


class PlaceOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not request.user.accounts.filter(account_type='pro-fx').exists():
            return Response({'error': 'Pro-FX account required'}, status=status.HTTP_403_FORBIDDEN)

        pair_id = request.data.get('pair_id')
        direction = request.data.get('direction')
        volume_lots = Decimal(request.data.get('volume_lots', '0.01'))
        sl = request.data.get('sl')
        tp = request.data.get('tp')
        time_frame = request.data.get('time_frame', 'M1')

        try:
            pair = ForexPair.objects.get(id=pair_id)
            account = request.user.accounts.get(account_type='pro-fx')

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


class PositionListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.accounts.filter(account_type='pro-fx').exists():
            return Response({'error': 'Pro-FX account required'}, status=status.HTTP_403_FORBIDDEN)

        positions = Position.objects.filter(user=request.user, status='open')
        for pos in positions:
            current_price = pos.pair.get_current_price()
            pos.update_floating_p_l(current_price)

        serializer = PositionSerializer(positions, many=True)
        return Response({'positions': serializer.data})


class ClosePositionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, position_id):
        if not request.user.accounts.filter(account_type='pro-fx').exists():
            return Response({'error': 'Pro-FX account required'}, status=status.HTTP_403_FORBIDDEN)
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
            logger.error(f"ClosePositionView error for position {position_id}: {str(e)}")
            return Response({'error': 'Failed to close position'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CloseAllPositionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        positions = Position.objects.filter(user=request.user, status='open')
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


# ==================== NEW: Close EA Positions ====================
class CloseEAPositionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_robot_id):
        """Close all open positions opened by a specific EA robot"""
        try:
            user_robot = UserRobot.objects.get(id=user_robot_id, user=request.user)
            
            if not user_robot.is_ea:
                return Response({'error': 'This robot is not an EA'}, status=status.HTTP_400_BAD_REQUEST)

            closed_count = user_robot.close_all_positions()

            return Response({
                'success': True,
                'message': f'Successfully closed {closed_count} position(s) from EA "{user_robot.robot.name}"',
                'closed_count': closed_count
            }, status=status.HTTP_200_OK)

        except UserRobot.DoesNotExist:
            return Response({'error': 'Robot not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error in CloseEAPositionsView: {e}", exc_info=True)
            return Response({'error': 'Failed to close EA positions'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ForexTradeHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.accounts.filter(account_type='pro-fx').exists():
            return Response({'error': 'Pro-FX account required'}, status=status.HTTP_403_FORBIDDEN)
        trades = ForexTrade.objects.filter(position__user=request.user)
        serializer = ForexTradeSerializer(trades, many=True)
        return Response({'trades': serializer.data})


class CurrentPriceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pair_id):
        if not request.user.accounts.filter(account_type='pro-fx').exists():
            return Response({'error': 'Pro-FX required'}, status=status.HTTP_403_FORBIDDEN)
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
        if not request.user.accounts.filter(account_type='pro-fx').exists():
            return Response({'error': 'Pro-FX account required'}, status=status.HTTP_403_FORBIDDEN)
        
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


class ForexRobotListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.accounts.filter(account_type='pro-fx').exists():
            return Response({'error': 'Pro-FX required'}, status=status.HTTP_403_FORBIDDEN)
        robots = ForexRobot.objects.filter(is_active=True)
        serializer = ForexRobotSerializer(robots, many=True)
        return Response({'robots': serializer.data})


class PurchaseRobotView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, robot_id):
        if not request.user.accounts.filter(account_type='pro-fx').exists():
            return Response({'error': 'Pro-FX account required'}, status=status.HTTP_403_FORBIDDEN)

        try:
            robot = ForexRobot.objects.get(id=robot_id, is_active=True)
        except ForexRobot.DoesNotExist:
            return Response({'error': 'Robot not found or inactive'}, status=status.HTTP_404_NOT_FOUND)

        if UserRobot.objects.filter(user=request.user, robot=robot).exists():
            return Response({'error': 'You already own this robot'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            usd = Currency.objects.get(code='USD')
            account = request.user.accounts.get(account_type='pro-fx')
            wallet = Wallet.objects.get(account=account, wallet_type='main', currency=usd)
        except Exception:
            return Response({'error': 'Wallet or account configuration error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        effective_price = robot.effective_price

        if wallet.balance < effective_price:
            return Response({'error': 'Insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)

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

            is_discounted = robot.discounted_price is not None and robot.discounted_price < robot.price
            description = f'Purchased robot: {robot.name}' + (' (discounted)' if is_discounted else '')

            Transaction.objects.create(
                account=account,
                amount=-effective_price,
                transaction_type='withdrawal',
                description=description
            )

        serializer = UserRobotSerializer(user_robot)
        return Response({
            'message': 'Robot purchased successfully',
            'user_robot': serializer.data,
            'purchased_price': effective_price,
            'discounted': is_discounted
        }, status=status.HTTP_201_CREATED)


class MyRobotsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_robots = UserRobot.objects.filter(user=request.user)
        serializer = UserRobotSerializer(user_robots, many=True)
        return Response({'user_robots': serializer.data})


# ==================== UPDATED: Toggle Robot View ====================
class ToggleRobotView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_robot_id):
        try:
            user_robot = UserRobot.objects.get(id=user_robot_id, user=request.user)
        except UserRobot.DoesNotExist:
            return Response({'error': 'Robot not found'}, status=status.HTTP_404_NOT_FOUND)

        payload = request.data
        if 'stake' in payload:
            user_robot.stake_per_trade = Decimal(str(payload['stake']))
        if 'pair_id' in payload:
            user_robot.selected_pair_id = payload['pair_id']
        if 'timeframe' in payload:
            user_robot.timeframe = payload['timeframe']

        was_running = user_robot.is_running
        is_ea = user_robot.is_ea

        user_robot.is_running = not user_robot.is_running
        user_robot.save(update_fields=['is_running', 'stake_per_trade', 'selected_pair', 'timeframe'])

        closed_count = 0

        if user_robot.is_running:  # Just started
            if is_ea:
                BotLog.objects.create(
                    user_robot=user_robot,
                    message="🚀 EA Bot Activated - Real positions will be opened automatically"
                )
            else:
                perform_robot_trade(user_robot)
                thread = threading.Thread(target=recurring_trade_loop, args=(user_robot.id,))
                thread.daemon = True
                thread.start()

            message = "Robot started successfully"
        else:  # Just stopped
            if is_ea:
                import time
                time.sleep(0.4)  # Give background worker time to finish current cycle
                closed_count = user_robot.close_all_positions()
                BotLog.objects.create(
                    user_robot=user_robot,
                    message=f"⛔ EA Bot Stopped - Closed {closed_count} open position(s)"
                )
                message = f"EA stopped and {closed_count} position(s) closed"
            else:
                message = "Robot stopped successfully"

        return Response({
            'is_running': user_robot.is_running,
            'message': message,
            'is_ea': is_ea,
            'closed_positions': closed_count
        })
    
# Helper functions (unchanged)
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
        usd = Currency.objects.get(code='USD')
        account = user.accounts.get(account_type='pro-fx')
        wallet = Wallet.objects.get(account=account, wallet_type='main', currency=usd)

        if wallet.balance < stake:
            BotLog.objects.create(
                user_robot=user_robot,
                message=f"Insufficient balance: ${wallet.balance} < ${stake}. Stopping."
            )
            user_robot.is_running = False
            user_robot.save()
            return

        BotLog.objects.create(user_robot=user_robot, message="Analyzing market conditions...")

        wallet.balance -= stake
        wallet.save()
        BotLog.objects.create(user_robot=user_robot, message=f"Stake deducted: ${stake}")

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