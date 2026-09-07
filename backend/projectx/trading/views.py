import time
import random
import logging
from decimal import Decimal
from datetime import date
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Robot, UserRobot, EliteRobotConfig, Trade, TradeType, Market
from .serializers import (
    EliteRobotConfigSerializer,
    EliteRobotConfigCreateSerializer,
    EliteRunStatusSerializer,
)
from django.core.mail import send_mail
from .models import Market, TradeType, Robot, UserRobot, TradingSetting, Trade, Signal
from .serializers import MarketSerializer, TradeTypeSerializer, RobotSerializer, UserRobotSerializer, TradeSerializer, SignalSerializer
from accounts.models import Account
from datetime import datetime, timedelta
from polygon import RESTClient
import pandas as pd
from django.utils import timezone
from django.conf import settings
from dashboard.models import Transaction
from django.db.models import Max

logger = logging.getLogger(__name__)

def get_elite_robot():
    """Return the single robot marked as elite (most expensive)."""
    return Robot.objects.filter(is_elite_robot=True).first()



class MarketListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        markets = Market.objects.all()
        serializer = MarketSerializer(markets, many=True)
        return Response(serializer.data)


class TradeTypeListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        trade_types = TradeType.objects.all()
        serializer = TradeTypeSerializer(trade_types, many=True)
        return Response(serializer.data)


class RobotListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        robots = Robot.objects.all()
        serializer = RobotSerializer(robots, many=True)
        return Response(serializer.data)


class PurchaseRobotView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, robot_id):
        account_type = request.data.get('account_type', 'standard')

        try:
            robot = Robot.objects.get(id=robot_id)
            account = Account.objects.get(user=request.user, account_type=account_type)
            effective_price = robot.effective_price

            # === DEMO ACCOUNT HANDLING ===
            if account.account_type == 'demo':
                if robot.available_for_demo:
                    user_robot, created = UserRobot.objects.get_or_create(
                        user=request.user, 
                        robot=robot,
                        defaults={
                            'purchased_price': Decimal('0.00'),
                            'win_rate': robot.win_rate,
                        }
                    )
                    if created:
                        pass
                    elif user_robot.win_rate is None:
                        user_robot.win_rate = robot.win_rate
                        user_robot.save(update_fields=['win_rate'])

                    response_data = {
                        'message': 'Robot assigned for demo use',
                        'robot_id': robot.id,
                        'robot_name': robot.name,
                        'is_deriv_robot': robot.is_deriv_robot
                    }

                    if robot.is_deriv_robot and robot.deriv_access_key:
                        response_data['deriv_access_key'] = robot.deriv_access_key
                        response_data['note'] = 'Use this access key on Deriv.com to activate your robot'

                    return Response(response_data, status=status.HTTP_200_OK)

                return Response({'error': 'This robot is not available for demo accounts'}, status=status.HTTP_400_BAD_REQUEST)

            # === REAL ACCOUNT PURCHASE ===
            if account.balance < effective_price:
                return Response({'error': 'Insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)

            account.balance -= effective_price
            account.save()

            is_discounted = robot.discounted_price is not None and robot.discounted_price < robot.price
            description = f'Purchased robot: {robot.name}' + (' (discounted)' if is_discounted else '')

            Transaction.objects.create(
                account=account,
                amount=-effective_price,
                transaction_type='debit',
                description=description
            )

            user_robot = UserRobot.objects.create(
                user=request.user,
                robot=robot,
                purchased_price=effective_price,
                win_rate=robot.win_rate,
            )

            response_data = {
                'message': 'Robot purchased successfully',
                'robot_id': robot.id,
                'robot_name': robot.name,
                'is_deriv_robot': robot.is_deriv_robot,
                'purchased_price': str(effective_price),
                'remaining_balance': str(account.balance)
            }

            if robot.is_deriv_robot:
                if robot.deriv_access_key:
                    response_data['deriv_access_key'] = robot.deriv_access_key
                    response_data['note'] = 'Purchase successful! Use this access key on Deriv.com to activate your robot.'
                    response_data['instruction'] = 'Go to Deriv and enter this key in your bot settings.'
                else:
                    response_data['warning'] = 'This is a Deriv Premium Robot but no access key was set by admin.'

            return Response(response_data, status=status.HTTP_201_CREATED)

        except Robot.DoesNotExist:
            return Response({'error': 'Robot not found'}, status=status.HTTP_404_NOT_FOUND)
        except Account.DoesNotExist:
            return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"PurchaseRobotView error: {str(e)}", exc_info=True)
            return Response({'error': 'An unexpected error occurred'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserRobotListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        owned = UserRobot.objects.filter(user=user).select_related('robot')
        serializer = UserRobotSerializer(owned, many=True)
        return Response(serializer.data)


class PlaceTradeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        user = request.user

        market_id = data.get('market_id') or data.get('market')
        trade_type_id = data.get('trade_type_id') or data.get('trade_type')
        direction = data.get('direction')
        amount = Decimal(str(data.get('amount', '0')))
        use_martingale = data.get('use_martingale', False)
        martingale_level = data.get('martingale_level', 0)
        robot_id = data.get('robot_id')
        account_type = data.get('account_type', 'standard')
        target_profit = data.get('target_profit')
        stop_loss = data.get('stop_loss')

        if target_profit is not None:
            try:
                target_profit = Decimal(str(target_profit))
            except:
                return Response({'error': 'Invalid target profit'}, status=status.HTTP_400_BAD_REQUEST)
        
        if stop_loss is not None:
            try:
                stop_loss = Decimal(str(stop_loss))
            except:
                return Response({'error': 'Invalid stop loss'}, status=status.HTTP_400_BAD_REQUEST)

        if amount < Decimal('0.5'):
            return Response({'error': 'Minimum trade amount is 0.5 USD'}, status=status.HTTP_400_BAD_REQUEST)
        if amount <= 0:
            return Response({'error': 'Amount must be positive'}, status=status.HTTP_400_BAD_REQUEST)

        current_amount = None
        try:
            market = Market.objects.get(id=market_id)
            trade_type = TradeType.objects.get(id=trade_type_id)
            account = Account.objects.get(user=user, account_type=account_type)
            is_demo = account.account_type == 'demo'
            effective_sashi = user.is_sashi or is_demo

            used_robot = None
            user_robot_obj = None
            if robot_id:
                robot = Robot.objects.get(id=robot_id)
                if is_demo:
                    if not robot.available_for_demo:
                        return Response({'error': 'Robot not available for demo'}, status=status.HTTP_400_BAD_REQUEST)
                    user_robot_obj, _ = UserRobot.objects.get_or_create(
                        user=user,
                        robot=robot,
                        defaults={'purchased_price': Decimal('0.00'), 'win_rate': robot.win_rate},
                    )
                else:
                    user_robot_obj = UserRobot.objects.get(user=user, robot=robot)
                used_robot = robot

            martingale_mult = TradingSetting.get_instance().martingale_multiplier
            current_amount = amount * (martingale_mult ** martingale_level)

            if account.balance < current_amount:
                return Response({'error': 'Insufficient balance for this trade'}, status=status.HTTP_400_BAD_REQUEST)

            account.balance = account.balance - current_amount

            if used_robot:
                if user_robot_obj is not None:
                    effective_rate = user_robot_obj.get_effective_win_rate()
                else:
                    effective_rate = used_robot.win_rate
                robot_rate = effective_rate / 100.0
                win_prob = max(0.0, min(1.0, robot_rate))
            else:
                win_prob = 0.80 if (effective_sashi and martingale_level == 0) else 0.95 if effective_sashi else 0.20

            if use_martingale and not effective_sashi and not used_robot:
                win_prob = 0.10

            time.sleep(random.uniform(1, 5))
            is_win = random.random() < win_prob

            entry_spot = round(random.uniform(1.0, 100.0), 5)
            delta = round(random.uniform(0.01, 0.1), 5)
            if direction == 'buy':
                exit_spot = entry_spot + delta if is_win else entry_spot - delta
            else:
                exit_spot = entry_spot - delta if is_win else entry_spot + delta
            current_spot = exit_spot

            if is_win:
                gross_payout = current_amount * market.profit_multiplier
                net_profit = gross_payout - current_amount
                account.balance = account.balance + gross_payout
            else:
                net_profit = -current_amount

            trade = Trade.objects.create(
                user=user,
                account=account,
                market=market,
                trade_type=trade_type,
                direction=direction.lower(),
                amount=current_amount,
                is_win=is_win,
                profit=net_profit,
                used_martingale=use_martingale and martingale_level > 0,
                martingale_level=martingale_level,
                used_robot=used_robot,
                session_profit_before=Decimal('0.00'),
                is_demo=is_demo,
                entry_spot=Decimal(str(entry_spot)),
                exit_spot=Decimal(str(exit_spot)),
                current_spot=Decimal(str(current_spot))
            )

            Transaction.objects.create(
                account=account,
                amount=net_profit,
                transaction_type='credit' if is_win else 'debit',
                description=f"{'Demo ' if is_demo else ''}Trade on {market.name}: {'Win' if is_win else 'Loss'} (Level {martingale_level})"
            )

            return Response({
                'trades': TradeSerializer([trade], many=True).data,
                'total_profit': net_profit,
                'message': 'Trade completed.',
                'is_demo': is_demo
            }, status=status.HTTP_201_CREATED)

        except (Market.DoesNotExist, TradeType.DoesNotExist, Account.DoesNotExist,
                Robot.DoesNotExist, UserRobot.DoesNotExist) as e:
            if current_amount and 'account' in locals():
                account.balance = account.balance + current_amount
            return Response({'error': 'Resource not found'}, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"Trade failed for {user.username}: {str(e)}", exc_info=True)
            if current_amount and 'account' in locals():
                account.balance = account.balance + current_amount
            return Response({'error': 'Trade failed'}, status=status.HTTP_400_BAD_REQUEST)


class TradeHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            params = request.query_params
            trades = Trade.objects.filter(user=request.user)
            
            if 'asset_id' in params:
                trades = trades.filter(market_id=params['asset_id'])
            if 'account_type' in params:
                trades = trades.filter(account__account_type=params['account_type'])
            if 'is_demo' in params:
                trades = trades.filter(is_demo=params['is_demo'].lower() == 'true')

            serializer = TradeSerializer(trades, many=True)
            today = date.today()
            session_trades = trades.filter(timestamp__date=today)
            total_session_profit = sum(trade.profit for trade in session_trades)

            return Response({
                'trades': serializer.data,
                'total_session_profit': total_session_profit
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ResetDemoBalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            demo_account = Account.objects.get(user=request.user, account_type='demo')
            demo_account.balance = Decimal('10000.00')
            demo_account.save()
            Transaction.objects.create(
                account=demo_account,
                amount=Decimal('10000.00'),
                transaction_type='credit',
                description='Demo balance reset'
            )
            return Response({'message': 'Demo balance reset to $10,000'}, status=status.HTTP_200_OK)
        except Account.DoesNotExist:
            return Response({'error': 'Demo account not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


def calculate_rsi(closes, period=14):
    if len(closes) < period + 1:
        return None
    delta = pd.Series(closes).diff()
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    avg_gain = gain.rolling(window=period, min_periods=period).mean()
    avg_loss = loss.rolling(window=period, min_periods=period).mean()
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return float(rsi.iloc[-1])


def calculate_atr(highs, lows, closes, period=14):
    if len(closes) < period + 1:
        return None
    df = pd.DataFrame({'high': highs, 'low': lows, 'close': closes})
    tr1 = df['high'] - df['low']
    tr2 = abs(df['high'] - df['close'].shift())
    tr3 = abs(df['low'] - df['close'].shift())
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.rolling(window=period, min_periods=period).mean()
    return float(atr.iloc[-1]) if not pd.isna(atr.iloc[-1]) else None


class GenerateSignalView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        try:
            ai_bot = Robot.objects.get(name__icontains='ai signal bot')
            if not UserRobot.objects.filter(user=user, robot=ai_bot).exists():
                return Response({'error': 'AI Signal Bot not activated'}, status=status.HTTP_403_FORBIDDEN)
        except Robot.DoesNotExist:
            return Response({'error': 'AI Signal Bot not configured'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        client = RESTClient(settings.POLYGON_API_KEY, connect_timeout=10, read_timeout=15)
        
        all_markets = list(Market.objects.all())
        if not all_markets:
            return Response({'error': 'No markets available for signal generation'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        import random
        markets = random.sample(all_markets, min(1, len(all_markets)))
        signals = []

        for market in markets:
            if market.market_type.name.lower() == 'forex':
                ticker = f"C:{market.name.upper()}"
            elif market.market_type.name.lower() == 'crypto':
                ticker = f"X:{market.name.upper()}"
            else:
                continue

            to_date = datetime.now()
            from_date = to_date - timedelta(days=14)

            try:
                for attempt in range(3):
                    try:
                        aggs = client.get_aggs(
                            ticker, multiplier=1, timespan="hour",
                            from_=from_date.strftime("%Y-%m-%d"),
                            to=to_date.strftime("%Y-%m-%d"), limit=500
                        )
                        break
                    except Exception as e:
                        if '429' in str(e):
                            logger.warning(f"Rate limit hit for {market.name} (attempt {attempt+1}/3)")
                            time.sleep(10)
                            continue
                        raise

                if len(aggs) < 15:
                    continue

                last_aggs = aggs[-15:]
                closes = [agg.close for agg in last_aggs]
                highs = [agg.high for agg in last_aggs]
                lows = [agg.low for agg in last_aggs]
                current_price = Decimal(str(closes[-1]))

                rsi = calculate_rsi(closes)
                atr = calculate_atr(highs, lows, closes) or Decimal('0.0005')

                if rsi is None:
                    continue

                buy_strength = max(35 - rsi, 0) if rsi < 35 else 0
                sell_strength = max(rsi - 65, 0) if rsi > 65 else 0
                strength = max(buy_strength, sell_strength)
                direction = 'buy' if buy_strength > sell_strength else 'sell'

                if strength == 0:
                    if rsi < 50:
                        buy_strength = (50 - rsi) * 0.6
                        direction = 'buy'
                    else:
                        sell_strength = (rsi - 50) * 0.6
                        direction = 'sell'
                    strength = max(buy_strength, sell_strength)

                base_prob = 65 + int(strength * 1.8)
                probability = max(60, min(base_prob, 92))

                confidence_factor = Decimal(probability) / Decimal('75')
                tp_offset = Decimal(atr) * Decimal('3.0') * confidence_factor
                sl_offset = Decimal(atr) * Decimal('1.8') / confidence_factor

                take_profit = (current_price + tp_offset) if direction == 'buy' else (current_price - tp_offset)
                stop_loss = (current_price - sl_offset) if direction == 'buy' else (current_price + sl_offset)

                signals.append({
                    'market': market,
                    'direction': direction,
                    'probability': probability,
                    'take_profit': take_profit.quantize(Decimal('0.00001')),
                    'stop_loss': stop_loss.quantize(Decimal('0.00001')),
                    'strength': strength,
                    'current_price': current_price
                })

            except Exception as e:
                logger.error(f"Failed to fetch data for {market.name}: {str(e)}", exc_info=True)
                continue

        if not signals:
            market = random.choice(all_markets)
            current_price = Decimal('1.1000')
            direction = random.choice(['buy', 'sell'])
            probability = random.randint(60, 80)
            strength = random.uniform(0, 10)
            tp_offset = Decimal(random.uniform(0.01, 0.02))
            sl_offset = Decimal(random.uniform(0.005, 0.01))
            take_profit = current_price + tp_offset if direction == 'buy' else current_price - tp_offset
            stop_loss = current_price - sl_offset if direction == 'buy' else current_price + sl_offset

            signals.append({
                'market': market,
                'direction': direction,
                'probability': probability,
                'take_profit': take_profit,
                'stop_loss': stop_loss,
                'strength': strength,
                'current_price': current_price
            })

        best_signal = max(signals, key=lambda s: s['probability'])

        signal = Signal.objects.create(
            user=user,
            market=best_signal['market'],
            direction=best_signal['direction'],
            probability=best_signal['probability'],
            take_profit=best_signal['take_profit'],
            stop_loss=best_signal['stop_loss']
        )
        signal.strength = best_signal['strength']
        signal.current_price = best_signal['current_price']
        signal.save()

        serializer = SignalSerializer(signal)
        response_data = serializer.data
        response_data['timeframe'] = '1 minute'
        response_data['note'] = 'High-precision AI signal optimized for short-term trading'

        return Response(response_data, status=status.HTTP_201_CREATED)


def get_digit_weights(digit_contract_type, digit_barrier, is_sashi, trade_count=0):
    if digit_contract_type == 'over':
        if is_sashi:
            if digit_barrier <= 4:
                return [5, 6, 7, 8, 9, 15, 25, 35, 45, 55]
            else:
                return [2, 3, 4, 5, 8, 15, 25, 40, 60, 80]
        else:
            return [40, 35, 30, 25, 20, 15, 10, 8, 6, 5]

    elif digit_contract_type == 'under':
        if is_sashi:
            if digit_barrier >= 5:
                return [55, 45, 35, 25, 18, 12, 8, 6, 5, 3]
            else:
                return [80, 60, 40, 25, 15, 8, 5, 3, 2, 1]
        else:
            return [3, 5, 8, 12, 18, 25, 30, 35, 40, 45]

    elif digit_contract_type == 'matches':
        if is_sashi:
            if trade_count < 3:
                weights = [5] * 10
                weights[digit_barrier] = 300
                return weights
            else:
                weights = [25] * 10
                weights[digit_barrier] = 3
                return weights
        else:
            weights = [30] * 10
            weights[digit_barrier] = 5
            return weights

    elif digit_contract_type == 'differs':
        if is_sashi:
            weights = [40] * 10
            weights[digit_barrier] = 2
            return weights
        else:
            weights = [8] * 10
            weights[digit_barrier] = 40
            return weights

    elif digit_contract_type == 'even':
        if is_sashi:
            return [5, 45, 5, 45, 5, 45, 5, 45, 5, 45]
        else:
            return [45, 5, 45, 5, 45, 5, 45, 5, 45, 5]

    elif digit_contract_type == 'odd':
        if is_sashi:
            return [45, 5, 45, 5, 45, 5, 45, 5, 45, 5]
        else:
            return [5, 45, 5, 45, 5, 45, 5, 45, 5, 45]

    return [10] * 10


class PlaceDigitTradeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Placeholder - keep existing logic if present
        return Response({'error': 'Use place-srobot or place-bulk'}, status=status.HTTP_400_BAD_REQUEST)


class PlaceSRobotTradeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        user = request.user

        robot_id = data.get('robot_id')
        market_id = data.get('market_id')
        digit_contract_type = data.get('digit_contract_type')
        digit_barrier = data.get('digit_barrier')
        amount = Decimal(str(data.get('amount', '0')))
        use_martingale = data.get('use_martingale', False)
        martingale_level = data.get('martingale_level', 0)
        account_type = data.get('account_type', 'standard')

        if not all([robot_id, market_id, digit_contract_type]):
            return Response({'error': 'robot_id, market_id and digit_contract_type are required'}, status=status.HTTP_400_BAD_REQUEST)

        if digit_contract_type in ['over', 'under', 'matches', 'differs'] and digit_barrier is None:
            return Response({'error': 'digit_barrier (0-9) is required'}, status=status.HTTP_400_BAD_REQUEST)

        if amount < Decimal('0.5'):
            return Response({'error': 'Minimum trade amount is 0.5 USD'}, status=status.HTTP_400_BAD_REQUEST)

        current_amount = None
        try:
            robot = Robot.objects.get(id=robot_id)
            if not robot.is_s_digit_robot:
                return Response({'error': 'This robot is not an S-Digit Robot'}, status=status.HTTP_400_BAD_REQUEST)

            market = Market.objects.get(id=market_id)
            account = Account.objects.get(user=user, account_type=account_type)
            is_demo = account.account_type == 'demo'
            is_sashi = getattr(user, 'is_sashi', False) or is_demo

            if not is_demo:
                UserRobot.objects.get(user=user, robot=robot)
            else:
                if not robot.available_for_demo:
                    return Response({'error': 'Robot not available for demo'}, status=status.HTTP_400_BAD_REQUEST)

            martingale_mult = TradingSetting.get_instance().martingale_multiplier
            current_amount = amount * (martingale_mult ** martingale_level)

            if account.balance < current_amount:
                return Response({'error': 'Insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)

            account.balance = account.balance - current_amount

            trade_count = Trade.objects.filter(user=user, used_robot=robot, digit_contract_type=digit_contract_type).count()
            weights = get_digit_weights(digit_contract_type, digit_barrier, is_sashi, trade_count)
            last_digit = random.choices(range(10), weights=weights, k=1)[0]

            if digit_contract_type == 'matches':
                is_win = (last_digit == digit_barrier)
            elif digit_contract_type == 'differs':
                is_win = (last_digit != digit_barrier)
            elif digit_contract_type == 'even':
                is_win = (last_digit % 2 == 0)
            elif digit_contract_type == 'odd':
                is_win = (last_digit % 2 == 1)
            elif digit_contract_type == 'over':
                is_win = (last_digit > digit_barrier)
            elif digit_contract_type == 'under':
                is_win = (last_digit < digit_barrier)
            else:
                is_win = False

            if digit_contract_type == 'over':
                payouts = {0:1.096,1:1.232,2:1.35,3:1.404,4:1.65,5:2.10,6:2.95,7:4.80,8:8.50,9:12.00}
                multiplier = Decimal(str(payouts.get(int(digit_barrier), 1.10)))
            elif digit_contract_type == 'under':
                payouts = {9:1.096,8:1.18,7:1.40,6:1.85,5:2.70,4:4.20,3:4.717,2:9.80,1:8.929,0:15.50}
                multiplier = Decimal(str(payouts.get(int(digit_barrier), 1.10)))
            elif digit_contract_type == 'matches':
                multiplier = Decimal('8.50')
            elif digit_contract_type == 'differs':
                multiplier = Decimal('1.12')
            else:
                multiplier = Decimal('1.92')

            time.sleep(random.uniform(1, 3))

            if is_win:
                gross_payout = current_amount * multiplier
                net_profit = gross_payout - current_amount
                account.balance = account.balance + gross_payout
            else:
                net_profit = -current_amount

            trade_type_obj = TradeType.objects.get_or_create(name='digit')[0]

            trade = Trade.objects.create(
                user=user,
                account=account,
                market=market,
                trade_type=trade_type_obj,
                direction=None,
                amount=current_amount,
                is_win=is_win,
                profit=net_profit,
                used_martingale=use_martingale and martingale_level > 0,
                martingale_level=martingale_level,
                used_robot=robot,
                session_profit_before=Decimal('0.00'),
                is_demo=is_demo,
                is_digit_trade=True,
                digit_contract_type=digit_contract_type,
                digit_barrier=digit_barrier,
                last_digit_outcome=last_digit,
            )

            Transaction.objects.create(
                account=account,
                amount=net_profit,
                transaction_type='credit' if is_win else 'debit',
                description=f"{'Demo ' if is_demo else ''}S-Robot {digit_contract_type.upper()} {'Win' if is_win else 'Loss'} (Digit: {last_digit})"
            )

            return Response({
                'trades': TradeSerializer([trade], many=True).data,
                'total_profit': net_profit,
                'last_digit': last_digit,
                'multiplier': float(multiplier),
                'is_win': is_win,
                'message': 'S Robot trade executed successfully.',
                'is_demo': is_demo
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"S Robot trade failed for {user.username}: {str(e)}", exc_info=True)
            if current_amount and 'account' in locals():
                account.balance = account.balance + current_amount
            return Response({'error': 'S Robot trade failed'}, status=status.HTTP_400_BAD_REQUEST)


class PlaceBulkTradeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        user = request.user

        robot_id = data.get('robot_id')
        market_id = data.get('market_id')
        digit_contract_type = data.get('digit_contract_type')
        digit_barrier = data.get('digit_barrier')
        amount = Decimal(str(data.get('amount', '0')))
        number_of_trades = int(data.get('number_of_trades') or data.get('num_trades') or 1)
        use_martingale = data.get('use_martingale', False)
        martingale_level = data.get('martingale_level', 0)
        account_type = data.get('account_type', 'standard')

        if not all([robot_id, market_id, digit_contract_type]):
            return Response(
                {'error': 'robot_id, market_id and digit_contract_type are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if digit_contract_type in ['over', 'under', 'matches', 'differs'] and digit_barrier is None:
            return Response(
                {'error': 'digit_barrier (0-9) is required for this contract type'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if amount < Decimal('0.5'):
            return Response({'error': 'Minimum trade amount is 0.5 USD'}, status=status.HTTP_400_BAD_REQUEST)

        if number_of_trades < 1:
            return Response({'error': 'number_of_trades must be at least 1'}, status=status.HTTP_400_BAD_REQUEST)

        total_deducted = Decimal('0.00')
        created_trades = []

        try:
            robot = Robot.objects.get(id=robot_id)
            if not robot.is_bulk_robot:
                return Response(
                    {'error': 'This robot is not a Bulk Trades AI Robot'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            max_allowed = robot.max_bulk_trades or 10
            if number_of_trades > max_allowed:
                return Response(
                    {'error': f'This robot allows maximum {max_allowed} trades per bulk request'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            market = Market.objects.get(id=market_id)
            account = Account.objects.get(user=user, account_type=account_type)
            is_demo = account.account_type == 'demo'
            is_sashi = getattr(user, 'is_sashi', False) or is_demo

            if not is_demo:
                UserRobot.objects.get(user=user, robot=robot)
            else:
                if not robot.available_for_demo:
                    return Response({'error': 'Robot not available for demo'}, status=status.HTTP_400_BAD_REQUEST)

            martingale_mult = TradingSetting.get_instance().martingale_multiplier
            single_amount = amount * (martingale_mult ** martingale_level)
            total_needed = single_amount * number_of_trades

            if account.balance < total_needed:
                return Response(
                    {'error': f'Insufficient balance. Need {total_needed} for {number_of_trades} trades'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            account.balance = account.balance - total_needed
            total_deducted = total_needed

            trade_type_obj = TradeType.objects.get_or_create(name='digit')[0]
            total_profit = Decimal('0.00')
            wins = 0
            losses = 0

            weights = get_digit_weights(digit_contract_type, digit_barrier, is_sashi, trade_count=0)
            last_digit = random.choices(range(10), weights=weights, k=1)[0]

            if digit_contract_type == 'matches':
                is_win = (last_digit == digit_barrier)
            elif digit_contract_type == 'differs':
                is_win = (last_digit != digit_barrier)
            elif digit_contract_type == 'even':
                is_win = (last_digit % 2 == 0)
            elif digit_contract_type == 'odd':
                is_win = (last_digit % 2 == 1)
            elif digit_contract_type == 'over':
                is_win = (last_digit > digit_barrier)
            elif digit_contract_type == 'under':
                is_win = (last_digit < digit_barrier)
            else:
                is_win = False

            if digit_contract_type == 'over':
                payouts = {0:1.096,1:1.232,2:1.35,3:1.404,4:1.65,5:2.10,6:2.95,7:4.80,8:8.50,9:12.00}
                multiplier = Decimal(str(payouts.get(int(digit_barrier), 1.10)))
            elif digit_contract_type == 'under':
                payouts = {9:1.096,8:1.18,7:1.40,6:1.85,5:2.70,4:4.20,3:4.717,2:9.80,1:8.929,0:15.50}
                multiplier = Decimal(str(payouts.get(int(digit_barrier), 1.10)))
            elif digit_contract_type == 'matches':
                multiplier = Decimal('8.50')
            elif digit_contract_type == 'differs':
                multiplier = Decimal('1.12')
            else:
                multiplier = Decimal('1.92')

            for i in range(number_of_trades):
                time.sleep(random.uniform(0.08, 0.22))

                if is_win:
                    gross_payout = single_amount * multiplier
                    net_profit = gross_payout - single_amount
                    account.balance = account.balance + gross_payout
                    wins += 1
                else:
                    net_profit = -single_amount
                    losses += 1

                total_profit += net_profit

                trade = Trade.objects.create(
                    user=user,
                    account=account,
                    market=market,
                    trade_type=trade_type_obj,
                    direction=None,
                    amount=single_amount,
                    is_win=is_win,
                    profit=net_profit,
                    used_martingale=use_martingale and martingale_level > 0,
                    martingale_level=martingale_level,
                    used_robot=robot,
                    session_profit_before=Decimal('0.00'),
                    is_demo=is_demo,
                    is_digit_trade=True,
                    digit_contract_type=digit_contract_type,
                    digit_barrier=digit_barrier,
                    last_digit_outcome=last_digit,
                )
                created_trades.append(trade)

                Transaction.objects.create(
                    account=account,
                    amount=net_profit,
                    transaction_type='credit' if is_win else 'debit',
                    description=f"{'Demo ' if is_demo else ''}Bulk AI {digit_contract_type.upper()} #{i+1} {'Win' if is_win else 'Loss'} (Digit: {last_digit})"
                )

            return Response({
                'trades': TradeSerializer(created_trades, many=True).data,
                'total_profit': total_profit,
                'number_of_trades': number_of_trades,
                'wins': wins,
                'losses': losses,
                'last_digit': last_digit,
                'message': f'Bulk Trades AI completed {number_of_trades} digit trades successfully.',
                'is_demo': is_demo,
                'robot_name': robot.name,
            }, status=status.HTTP_201_CREATED)

        except (Robot.DoesNotExist, Market.DoesNotExist, Account.DoesNotExist, UserRobot.DoesNotExist):
            if total_deducted > 0 and 'account' in locals():
                account.balance = account.balance + total_deducted
            return Response({'error': 'Resource not found'}, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"Bulk digit trade failed for {user.username}: {str(e)}", exc_info=True)
            if total_deducted > 0 and 'account' in locals():
                account.balance = account.balance + total_deducted
            return Response({'error': 'Bulk trade failed'}, status=status.HTTP_400_BAD_REQUEST)


class EliteConfigView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        elite = get_elite_robot()
        if not elite:
            return Response(
                {'error': 'No Elite robot has been configured by admin yet'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not UserRobot.objects.filter(user=request.user, robot=elite).exists():
            return Response(
                {'error': 'You have not purchased the Elite robot'},
                status=status.HTTP_403_FORBIDDEN
            )

        config = EliteRobotConfig.objects.filter(user=request.user, robot=elite).first()
        if not config:
            return Response({'config': None}, status=status.HTTP_200_OK)

        return Response({
            'config': EliteRobotConfigSerializer(config).data
        }, status=status.HTTP_200_OK)

    def post(self, request):
        elite = get_elite_robot()
        if not elite:
            return Response(
                {'error': 'No Elite robot configured'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not UserRobot.objects.filter(user=request.user, robot=elite).exists():
            return Response(
                {'error': 'You must purchase the Elite robot first'},
                status=status.HTTP_403_FORBIDDEN
            )

        data = request.data.copy()
        data['robot'] = elite.id

        existing = EliteRobotConfig.objects.filter(user=request.user, robot=elite).first()
        if existing:
            serializer = EliteRobotConfigCreateSerializer(existing, data=data, partial=True)
        else:
            serializer = EliteRobotConfigCreateSerializer(data=data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        config = serializer.save(user=request.user, robot=elite)

        # Mark this UserRobot as configured for Elite (is_setting = True)
        user_robot = UserRobot.objects.filter(user=request.user, robot=elite).first()
        if user_robot:
            user_robot.is_setting = True
            user_robot.save(update_fields=['is_setting'])

        code = config.generate_config_code()

        try:
            subject = f"Your {elite.name} Configuration Code"
            message = (
                f"Hello {request.user.username},\n\n"
                f"Your configuration for the Elite robot \"{elite.name}\" has been saved.\n\n"
                f"Configuration Code: {code}\n\n"
                f"Settings:\n"
                f"  • Market     : {config.target_market}\n"
                f"  • Timeframe  : {config.timeframe}\n"
                f"  • Stake      : ${config.stake}\n"
                f"  • Target     : ${config.target_profit}\n\n"
                f"This code is valid for 24 hours.\n"
                f"Go to the Trading Interface, select the Elite robot, "
                f"click RUN and enter this code to start the autonomous engine.\n\n"
                f"Happy trading!"
            )
            send_mail(
                subject,
                message,
                getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@yourdomain.com'),
                [request.user.email],
                fail_silently=False,
            )
            email_sent = True
        except Exception as e:
            logger.error(f"Failed to send elite config email: {e}", exc_info=True)
            email_sent = False

        return Response({
            'message': 'Configuration saved. Check your email for the code.',
            'config': EliteRobotConfigSerializer(config).data,
            'config_code': code,
            'email_sent': email_sent,
        }, status=status.HTTP_200_OK)


class EliteValidateCodeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = (request.data.get('config_code') or '').strip().upper()
        if not code:
            return Response({'error': 'config_code is required'}, status=status.HTTP_400_BAD_REQUEST)

        elite = get_elite_robot()
        if not elite:
            return Response({'error': 'Elite robot not found'}, status=status.HTTP_404_NOT_FOUND)

        config = EliteRobotConfig.objects.filter(
            user=request.user,
            robot=elite,
            config_code=code
        ).first()

        if not config:
            return Response({'error': 'Invalid configuration code'}, status=status.HTTP_400_BAD_REQUEST)

        if config.code_used:
            return Response({'error': 'This code has already been used. Generate a new one.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if config.code_expires_at and timezone.now() > config.code_expires_at:
            return Response({'error': 'This code has expired. Please generate a new one.'},
                            status=status.HTTP_400_BAD_REQUEST)

        config.code_used = True
        config.save(update_fields=['code_used'])

        return Response({
            'valid': True,
            'config': EliteRobotConfigSerializer(config).data
        }, status=status.HTTP_200_OK)


class EliteStartRunView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        elite = get_elite_robot()
        if not elite:
            return Response({'error': 'Elite robot not found'}, status=status.HTTP_404_NOT_FOUND)

        config = EliteRobotConfig.objects.filter(user=request.user, robot=elite).first()
        if not config:
            return Response({'error': 'No configuration found. Please configure the robot first.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if not config.code_used:
            return Response({'error': 'Please validate the configuration code first.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if config.is_running:
            return Response({'error': 'Robot is already running.'}, status=status.HTTP_400_BAD_REQUEST)

        account_type = request.data.get('account_type', 'standard')
        try:
            account = Account.objects.get(user=request.user, account_type=account_type)
        except Account.DoesNotExist:
            return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)

        if account.balance < config.stake:
            return Response(
                {'error': f'Insufficient balance. Need at least ${config.stake}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        config.is_running = True
        config.run_started_at = timezone.now()
        config.current_profit = Decimal('0.00')
        config.last_credited_profit = Decimal('0.00')
        config.target_email_sent = False
        config.status_message = 'Initializing market scan...'
        config.last_entry = ''
        config.save()

        # Mark the UserRobot as used so Settings icon is hidden after this run
        user_robot = UserRobot.objects.filter(user=request.user, robot=elite).first()
        if user_robot and not user_robot.is_used:
            user_robot.is_used = True
            user_robot.save(update_fields=['is_used'])

        return Response({
            'message': 'Elite robot engine started',
            'config': EliteRobotConfigSerializer(config).data,
            'expected_duration_seconds': config.get_expected_duration_seconds(),
        }, status=status.HTTP_200_OK)


class EliteRunStatusView(APIView):
    """
    GET → returns live status.
    Credits profit to the wallet progressively after every gain.
    Sends email when target is reached (only once).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        elite = get_elite_robot()
        if not elite:
            return Response({'error': 'Elite robot not found'}, status=status.HTTP_404_NOT_FOUND)

        config = EliteRobotConfig.objects.filter(user=request.user, robot=elite).first()
        if not config:
            return Response({'error': 'No configuration'}, status=status.HTTP_404_NOT_FOUND)

        if not config.is_running:
            return Response({
                'is_running': False,
                'current_profit': config.current_profit,
                'target_profit': config.target_profit,
                'status_message': config.status_message or 'Idle',
                'last_entry': config.last_entry,
                'progress_percent': 0,
                'time_remaining_seconds': 0,
                'target_reached': False,
            })

        # ---------- Simulation logic ----------
        now = timezone.now()
        elapsed = (now - config.run_started_at).total_seconds()
        total_duration = config.get_expected_duration_seconds()
        progress = min(elapsed / total_duration, 1.0)

        noise = random.uniform(0.85, 1.15)
        expected_profit = float(config.target_profit) * progress * noise
        expected_profit = max(0, min(expected_profit, float(config.target_profit) * 1.05))

        messages = [
            f"Scanning {config.target_market} on {config.timeframe} timeframe...",
            "Detecting liquidity zones...",
            "Analyzing order flow & volume delta...",
            "Strong confluence detected – preparing entry...",
            f"Entry triggered on {config.target_market}",
            "Managing open position...",
            "Partial take-profit hit – locking gains...",
            "Re-scanning market for next high-probability setup...",
            "Waiting for optimal risk/reward setup...",
            "Market conditions shifting – adapting strategy...",
        ]
        if random.random() < 0.35 or not config.status_message:
            config.status_message = random.choice(messages)

        if "Entry triggered" in config.status_message or random.random() < 0.2:
            directions = ['BUY', 'SELL']
            config.last_entry = f"{random.choice(directions)} {config.target_market} @ {random.uniform(1.05, 1.25):.5f}"

        new_profit = Decimal(str(round(expected_profit, 2)))
        config.current_profit = new_profit

        # ========== PROGRESSIVE BALANCE UPDATE ==========
        profit_to_credit = new_profit - config.last_credited_profit

        if profit_to_credit > Decimal('0.50'):
            account_type = request.query_params.get('account_type', 'standard')
            try:
                account = Account.objects.get(user=request.user, account_type=account_type)
                account.balance += profit_to_credit
                account.save()

                Transaction.objects.create(
                    account=account,
                    amount=profit_to_credit,
                    transaction_type='credit',
                    description=f"Elite Robot '{elite.name}' live profit +${profit_to_credit}"
                )

                config.last_credited_profit = new_profit
            except Account.DoesNotExist:
                pass

        target_reached = progress >= 1.0 or config.current_profit >= config.target_profit

        if target_reached:
            config.current_profit = config.target_profit
            config.is_running = False
            config.status_message = f"🎯 Target profit of ${config.target_profit} reached! Please reset."

            # Final catch-up credit
            remaining = config.target_profit - config.last_credited_profit
            if remaining > 0:
                account_type = request.query_params.get('account_type', 'standard')
                try:
                    account = Account.objects.get(user=request.user, account_type=account_type)
                    account.balance += remaining
                    account.save()
                    Transaction.objects.create(
                        account=account,
                        amount=remaining,
                        transaction_type='credit',
                        description=f"Elite Robot '{elite.name}' final target credit +${remaining}"
                    )
                    config.last_credited_profit = config.target_profit
                except Account.DoesNotExist:
                    pass

            # ========== SEND TARGET REACHED EMAIL (only once) ==========
            if not config.target_email_sent:
                try:
                    subject = f"🎯 Target Reached – {elite.name}"
                    message = (
                        f"Hello {request.user.username},\n\n"
                        f"Congratulations!\n\n"
                        f"Your Elite Robot \"{elite.name}\" has successfully reached the target profit.\n\n"
                        f"Details:\n"
                        f"  • Market        : {config.target_market}\n"
                        f"  • Timeframe     : {config.timeframe}\n"
                        f"  • Target Profit : ${config.target_profit}\n"
                        f"  • Final Profit  : ${config.current_profit}\n\n"
                        f"The profit has been credited to your account.\n"
                        f"You can now reset the robot from the Trading Interface if you wish to run it again.\n\n"
                        f"Happy trading!\n"
                        f"TradeRiser Team"
                    )
                    send_mail(
                        subject,
                        message,
                        getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@yourdomain.com'),
                        [request.user.email],
                        fail_silently=True,
                    )
                    config.target_email_sent = True
                except Exception as e:
                    logger.error(f"Failed to send target-reached email: {e}", exc_info=True)

        config.save()

        time_remaining = max(0, int(total_duration - elapsed))

        return Response({
            'is_running': config.is_running,
            'current_profit': config.current_profit,
            'target_profit': config.target_profit,
            'status_message': config.status_message,
            'last_entry': config.last_entry,
            'progress_percent': round(progress * 100, 1),
            'time_remaining_seconds': time_remaining,
            'target_reached': target_reached,
            'stake': config.stake,
            'market': config.target_market,
            'timeframe': config.timeframe,
        }, status=status.HTTP_200_OK)


class EliteResetView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        elite = get_elite_robot()
        if not elite:
            return Response({'error': 'Elite robot not found'}, status=status.HTTP_404_NOT_FOUND)

        config = EliteRobotConfig.objects.filter(user=request.user, robot=elite).first()
        if not config:
            return Response({'error': 'No configuration'}, status=status.HTTP_404_NOT_FOUND)

        config.reset_run()

        return Response({
            'message': 'Elite robot has been reset. You can configure and run again.',
            'config': EliteRobotConfigSerializer(config).data
        }, status=status.HTTP_200_OK)


class EliteStopView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        elite = get_elite_robot()
        if not elite:
            return Response({'error': 'Elite robot not found'}, status=status.HTTP_404_NOT_FOUND)

        config = EliteRobotConfig.objects.filter(user=request.user, robot=elite).first()
        if not config:
            return Response({'error': 'No configuration'}, status=status.HTTP_404_NOT_FOUND)

        config.is_running = False
        config.status_message = 'Stopped by user'
        config.save(update_fields=['is_running', 'status_message'])

        return Response({
            'message': 'Elite robot stopped',
            'current_profit': config.current_profit
        }, status=status.HTTP_200_OK)


class EliteUpgradeView(APIView):
    """
    Charge the full original price of the Elite robot and reset is_used=False
    so the user can configure it again.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        elite = get_elite_robot()
        if not elite:
            return Response({'error': 'Elite robot not found'}, status=status.HTTP_404_NOT_FOUND)

        user_robot = UserRobot.objects.filter(user=request.user, robot=elite).first()
        if not user_robot:
            return Response(
                {'error': 'You have not purchased the Elite robot'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not user_robot.is_used:
            return Response(
                {'error': 'This robot is already unlocked for configuration'},
                status=status.HTTP_400_BAD_REQUEST
            )

        account_type = request.data.get('account_type', 'standard')
        try:
            account = Account.objects.get(user=request.user, account_type=account_type)
        except Account.DoesNotExist:
            return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)

        # Always charge the full original price (not discounted)
        full_price = elite.price

        if account.balance < full_price:
            return Response(
                {'error': f'Insufficient balance. Need ${full_price}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Deduct full price
        account.balance -= full_price
        account.save()

        Transaction.objects.create(
            account=account,
            amount=-full_price,
            transaction_type='debit',
            description=f'Upgrade to Elite unlock: {elite.name}'
        )

        # Unlock settings again
        user_robot.is_used = False
        user_robot.save(update_fields=['is_used'])

        return Response({
            'message': 'Upgrade successful. Settings unlocked. You can now configure the Elite robot again.',
            'is_used': False,
            'is_setting': user_robot.is_setting,
            'amount_charged': str(full_price),
            'remaining_balance': str(account.balance),
        }, status=status.HTTP_200_OK)
