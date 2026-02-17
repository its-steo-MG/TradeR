# forex/views.py
import random
from decimal import Decimal
import logging
import importlib
import time
import threading
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, generics
from .models import ForexPair, Position, ForexTrade, ForexRobot, UserRobot
from .serializers import ForexPairSerializer, PositionSerializer, ForexTradeSerializer, ForexRobotSerializer, UserRobotSerializer
from accounts.models import Account
from wallet.models import Wallet, Currency
from dashboard.models import Transaction
from django.db import transaction
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from .serializers import BotLogSerializer
from .models import BotLog

logger = logging.getLogger(__name__)

class ForexPairListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.accounts.filter(account_type='pro-fx').exists():
            return Response(
                {'error': 'Pro-FX account required'},
                status=status.HTTP_403_FORBIDDEN
            )
        pairs = ForexPair.objects.all()
        serializer = ForexPairSerializer(pairs, many=True)
        return Response({'pairs': serializer.data})

class PlaceOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not request.user.accounts.filter(account_type='pro-fx').exists():
            return Response(
                {'error': 'Pro-FX account required'},
                status=status.HTTP_403_FORBIDDEN
            )

        pair_id = request.data.get('pair_id')
        direction = request.data.get('direction')  # 'buy' or 'sell'
        volume_lots = Decimal(request.data.get('volume_lots', '0.01'))
        sl = request.data.get('sl')
        tp = request.data.get('tp')
        time_frame = request.data.get('time_frame', 'M1')  # Default to 1 minute

        try:
            pair = ForexPair.objects.get(id=pair_id)
            account = request.user.accounts.get(account_type='pro-fx')

            # Simulated entry price
            entry_price = pair.get_current_price(time_frame=time_frame)
            if entry_price <= 0:
                return Response(
                    {'error': 'Failed to generate price'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Calculate margin
            margin = (volume_lots * pair.contract_size * entry_price) / 500  # Using leverage 500
            usd = Currency.objects.get(code='USD')
            wallet = Wallet.objects.get(account=account, wallet_type='main', currency=usd)

            # Check account balance before placing trade
            if wallet.balance < margin:
                return Response(
                    {'error': 'Insufficient balance for margin'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create the position
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

# ----------------------------------------------------------------------
# 3. List open positions
# ----------------------------------------------------------------------
class PositionListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.accounts.filter(account_type='pro-fx').exists():
            return Response(
                {'error': 'Pro-FX account required'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Update floating P&L for all open positions
        positions = Position.objects.filter(user=request.user, status='open')
        for pos in positions:
            current_price = pos.pair.get_current_price()
            pos.update_floating_p_l(current_price)
            # Auto close checks (SL/TP)
            if pos.sl and ((pos.direction == 'buy' and current_price <= pos.sl) or (pos.direction == 'sell' and current_price >= pos.sl)):
                pos.close_position(current_price, is_auto=True, close_reason='sl')
            elif pos.tp and ((pos.direction == 'buy' and current_price >= pos.tp) or (pos.direction == 'sell' and current_price <= pos.tp)):
                pos.close_position(current_price, is_auto=True, close_reason='tp')

        serializer = PositionSerializer(positions, many=True)
        return Response({'positions': serializer.data})  # Wrapped in {'positions': [...]}

# ----------------------------------------------------------------------
# 4. Manually close a position
# ----------------------------------------------------------------------
class ClosePositionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, position_id):
        if not request.user.accounts.filter(account_type='pro-fx').exists():
            return Response(
                {'error': 'Pro-FX account required'},
                status=status.HTTP_403_FORBIDDEN
            )
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

# ----------------------------------------------------------------------
# 5. Trade history
# ----------------------------------------------------------------------
class ForexTradeHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.accounts.filter(account_type='pro-fx').exists():
            return Response(
                {'error': 'Pro-FX account required'},
                status=status.HTTP_403_FORBIDDEN
            )
        trades = ForexTrade.objects.filter(position__user=request.user)
        serializer = ForexTradeSerializer(trades, many=True)
        return Response({'trades': serializer.data})  # Wrapped in {'trades': [...]}

# ----------------------------------------------------------------------
# 6. Helper – get the **simulated** current price for a single pair
# ----------------------------------------------------------------------
class CurrentPriceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pair_id):
        if not request.user.accounts.filter(account_type='pro-fx').exists():
            return Response(
                {'error': 'Pro-FX required'},
                status=status.HTTP_403_FORBIDDEN
            )
        try:
            pair = ForexPair.objects.get(id=pair_id)
        except ForexPair.DoesNotExist:
            return Response(
                {'error': 'Pair not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        price = pair.get_current_price()
        return Response({'current_price': float(price)})

class CurrentPricesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @method_decorator(cache_page(1))
    def get(self, request):
        if not request.user.accounts.filter(account_type='pro-fx').exists():
            return Response(
                {'error': 'Pro-FX account required'},
                status=status.HTTP_403_FORBIDDEN
            )
        ids_str = request.query_params.get('ids', '')
        if not ids_str:
            return Response(
                {'error': 'ids parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            pair_ids = [int(id.strip()) for id in ids_str.split(',') if id.strip().isdigit()]
            if not pair_ids:
                return Response(
                    {'error': 'No valid pair IDs provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            pairs = ForexPair.objects.filter(id__in=pair_ids)
            if len(pairs) != len(pair_ids):
                return Response(
                    {'error': 'Some pairs not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            prices = {}
            for pair in pairs:
                prices[pair.id] = float(pair.get_current_price())
            return Response({'prices': prices})
        except ValueError:
            return Response(
                {'error': 'Invalid ids format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
class CloseAllPositionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        positions = Position.objects.filter(user=request.user, status='open')
        if not positions.exists():
            return Response({'message': 'No open positions to close'}, status=status.HTTP_200_OK)
        
        with transaction.atomic():
            for position in positions:
                current_price = position.pair.get_current_price(
                    position.entry_time,
                    is_sashi=request.user.is_sashi,
                    direction=position.direction
                )
                position.close_position(current_price, is_auto=False, close_reason='manual')
        
        return Response({'message': 'All positions closed successfully'}, status=status.HTTP_200_OK)
    
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
        # Ensure user has Pro-FX account
        if not request.user.accounts.filter(account_type='pro-fx').exists():
            return Response(
                {'error': 'Pro-FX account required to purchase robots'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            robot = ForexRobot.objects.get(id=robot_id, is_active=True)
        except ForexRobot.DoesNotExist:
            return Response(
                {'error': 'Robot not found or inactive'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Prevent duplicate purchase
        if UserRobot.objects.filter(user=request.user, robot=robot).exists():
            return Response(
                {'error': 'You already own this robot'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get wallet and effective price
        try:
            usd = Currency.objects.get(code='USD')
            account = request.user.accounts.get(account_type='pro-fx')
            wallet = Wallet.objects.get(account=account, wallet_type='main', currency=usd)
        except (Currency.DoesNotExist, Account.DoesNotExist, Wallet.DoesNotExist):
            return Response(
                {'error': 'Wallet or account configuration error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        effective_price = robot.effective_price  # Uses discounted_price if set, else price

        if wallet.balance < effective_price:
            return Response(
                {'error': 'Insufficient balance'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Perform purchase atomically
        with transaction.atomic():
            wallet.balance -= effective_price
            wallet.save()

            # Create ownership record with default user settings from robot
            user_robot = UserRobot.objects.create(
                user=request.user,
                robot=robot,
                stake_per_trade=robot.stake_per_trade  # Inherit default stake
            )

            # Determine transaction description
            is_discounted = (
                robot.discounted_price is not None and
                robot.discounted_price < robot.price
            )
            description = (
                f'Purchased robot: {robot.name}'
                + (' (discounted)' if is_discounted else '')
            )

            # Log the purchase transaction
            Transaction.objects.create(
                account=account,
                amount=-effective_price,
                transaction_type='withdrawal',  # or 'debit' if you prefer consistency
                description=description
            )

        # Serialize and return the new UserRobot instance
        serializer = UserRobotSerializer(user_robot)

        return Response({
            'message': 'Robot purchased successfully',
            'user_robot': serializer.data,
            'purchased_price': effective_price,
            'discounted': is_discounted
        }, status=status.HTTP_201_CREATED)
    

# forex/views.py
class MyRobotsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_robots = UserRobot.objects.filter(user=request.user)
        serializer = UserRobotSerializer(user_robots, many=True)
        return Response({'user_robots': serializer.data}) 


class ToggleRobotView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_robot_id):
        try:
            user_robot = UserRobot.objects.get(id=user_robot_id, user=request.user)
        except UserRobot.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        # Extract config from payload
        payload = request.data
        stake = payload.get('stake')
        pair_id = payload.get('pair_id')
        timeframe = payload.get('timeframe')

        if stake is not None:
            user_robot.stake_per_trade = Decimal(str(stake))
        if pair_id is not None:
            user_robot.selected_pair_id = pair_id
        if timeframe:
            user_robot.timeframe = timeframe

        is_starting = not user_robot.is_running
        user_robot.is_running = is_starting
        user_robot.save()

        if is_starting:
            # Run first trade synchronously
            perform_robot_trade(user_robot)

            # Start recurring trades in background thread
            thread = threading.Thread(target=recurring_trade_loop, args=(user_robot.id,))
            thread.daemon = True  # Dies with server
            thread.start()

        return Response({
            'is_running': user_robot.is_running,
            'message': 'Started' if user_robot.is_running else 'Stopped'
        })


# Helper function for recurring trades
def recurring_trade_loop(user_robot_id):
    while True:
        try:
            user_robot = UserRobot.objects.get(id=user_robot_id)
            if not user_robot.is_running:
                logger.info(f"Stopping trade loop for robot {user_robot_id}")
                break

            perform_robot_trade(user_robot)
            time.sleep(10)  # Every 10 seconds
        except UserRobot.DoesNotExist:
            logger.error(f"UserRobot {user_robot_id} not found - stopping loop")
            break
        except Exception as e:
            logger.error(f"Error in trade loop: {str(e)}")
            time.sleep(10)  # Retry after delay


# Simulation logic (moved from task.py)
def perform_robot_trade(user_robot):
    try:
        robot = user_robot.robot
        user = user_robot.user
        is_sashi = getattr(user, 'is_sashi', False)
        win_rate = robot.win_rate_sashi if is_sashi else robot.win_rate_normal

        # Use user-configured stake
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

        # Realistic logs
        BotLog.objects.create(
            user_robot=user_robot,
            message="Analyzing market conditions..."
        )

        # Deduct stake
        wallet.balance -= stake
        wallet.save()
        BotLog.objects.create(
            user_robot=user_robot,
            message=f"Stake deducted: ${stake}"
        )

        # Simulate analysis delay
        time.sleep(random.uniform(1, 3))  # Shorter for realism

        BotLog.objects.create(
            user_robot=user_robot,
            message="Entering trade..."
        )

        # Simulate win/loss
        is_win = random.random() * 100 < win_rate
        profit = (stake * robot.profit_multiplier) if is_win else -stake

        wallet.balance += stake + profit
        wallet.save()

        result = "WIN" if is_win else "LOSS"
        BotLog.objects.create(
            user_robot=user_robot,
            message=f"Trade {result}! Profit: ${profit:+.2f} (x{robot.profit_multiplier})",
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
        BotLog.objects.create(
            user_robot=user_robot,
            message=f"Error: {str(e)}"
        )



from rest_framework import generics
from django.db import transaction  

class BotLogListView(generics.ListAPIView):
    """
    GET /api/forex/robot-logs/                → all logs of the user (fetched and deleted after response)
    GET /api/forex/robot-logs/?user_robot_id=5 → logs for specific UserRobot (fetched and deleted after response)
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BotLogSerializer

    def get_queryset(self):
        queryset = BotLog.objects.filter(
            user_robot__user=self.request.user
        ).select_related('user_robot', 'user_robot__robot').order_by('-timestamp')

        user_robot_id = self.request.query_params.get('user_robot_id')
        if user_robot_id:
            try:
                user_robot_id = int(user_robot_id)
                queryset = queryset.filter(user_robot_id=user_robot_id)
            except ValueError:
                pass  # ignore invalid ID

        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        
        # Wrap the response and deletion in a transaction for safety
        with transaction.atomic():
            response = Response(serializer.data)
            # Delete the fetched logs after serializing (to free DB space)
            queryset.delete()
        
        return response