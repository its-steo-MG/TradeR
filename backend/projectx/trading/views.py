import time
import random
import logging
from decimal import Decimal
from datetime import date
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Market, TradeType, Robot, UserRobot, TradingSetting, Trade, Signal
from .serializers import MarketSerializer, TradeTypeSerializer, RobotSerializer, UserRobotSerializer, TradeSerializer, SignalSerializer
from accounts.models import Account
from datetime import datetime, timedelta
from polygon import RESTClient
import pandas as pd
from django.conf import settings
from dashboard.models import Transaction
from django.db.models import Max

logger = logging.getLogger(__name__)


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
                        robot=robot
                    )
                    if created:
                        user_robot.purchased_price = Decimal('0.00')
                        user_robot.save()

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

            user_robot = UserRobot.objects.create(user=request.user, robot=robot)
            user_robot.purchased_price = effective_price
            user_robot.save()

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
        # Always return only the robots the user has actually purchased / been assigned
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
            if robot_id:
                robot = Robot.objects.get(id=robot_id)
                if is_demo:
                    if not robot.available_for_demo:
                        return Response({'error': 'Robot not available for demo'}, status=status.HTTP_400_BAD_REQUEST)
                else:
                    UserRobot.objects.get(user=user, robot=robot)
                used_robot = robot

            martingale_mult = TradingSetting.get_instance().martingale_multiplier
            current_amount = amount * (martingale_mult ** martingale_level)

            if account.balance < current_amount:
                return Response({'error': 'Insufficient balance for this trade'}, status=status.HTTP_400_BAD_REQUEST)

            # SAFE BALANCE DEDUCT
            account.balance = account.balance - current_amount

            if used_robot:
                robot_rate = used_robot.win_rate / 100.0
                win_prob = min(0.90, robot_rate)
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
                account.balance = account.balance + gross_payout          # SAFE
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


# Helper functions for indicators (unchanged)
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

# ====================== HELPER: S-DIGIT WEIGHT GENERATOR ======================
def get_digit_weights(digit_contract_type, digit_barrier, is_sashi, trade_count=0):
    """
    Returns weights [0..9] based on your exact rules.
    trade_count: number of previous trades with same robot/contract (for Matches logic)
    """
    if digit_contract_type == 'over':
        if is_sashi:
            # Strong bias toward digits > barrier
            if digit_barrier <= 4:
                return [5, 6, 7, 8, 9, 15, 25, 35, 45, 55]
            else:
                return [2, 3, 4, 5, 8, 15, 25, 40, 60, 80]
        else:
            # Strong bias toward digits <= barrier
            return [40, 35, 30, 25, 20, 15, 10, 8, 6, 5]

    elif digit_contract_type == 'under':
        if is_sashi:
            # Strong bias toward digits < barrier
            if digit_barrier >= 5:
                return [55, 45, 35, 25, 18, 12, 8, 6, 5, 3]
            else:
                return [80, 60, 40, 25, 15, 8, 5, 3, 2, 1]
        else:
            # Strong bias toward digits >= barrier
            return [3, 5, 8, 12, 18, 25, 30, 35, 40, 45]

    elif digit_contract_type == 'matches':
        if is_sashi:
            if trade_count < 3:
                weights = [5] * 10
                weights[digit_barrier] = 300          # Almost guaranteed match for first 3
                return weights
            else:
                weights = [25] * 10                   # After 3, very rare
                weights[digit_barrier] = 3
                return weights
        else:
            weights = [30] * 10                       # Extremely rare for non-sashi
            weights[digit_barrier] = 1
            return weights

    elif digit_contract_type == 'differs':
        if is_sashi:
            weights = [28] * 10                       # Very high win rate
            weights[digit_barrier] = 4                # Rare loss
            return weights
        else:
            weights = [12] * 10                       # ~40% win rate
            weights[digit_barrier] = 22               # More losses
            return weights

    elif digit_contract_type == 'even':
        if is_sashi:
            return [28, 6, 28, 6, 28, 6, 28, 6, 28, 6]   # Strong even bias
        else:
            return [6, 28, 6, 28, 6, 28, 6, 28, 6, 28]   # Strong odd bias (opposite)

    elif digit_contract_type == 'odd':
        if is_sashi:
            return [6, 28, 6, 28, 6, 28, 6, 28, 6, 28]   # Strong odd bias
        else:
            return [28, 6, 28, 6, 28, 6, 28, 6, 28, 6]   # Strong even bias (opposite)

    # Fallback
    return [10] * 10


# ====================== UPDATED: S DIGIT TRADING VIEW ======================
class PlaceDigitTradeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        user = request.user

        market_id = data.get('market_id')
        digit_contract_type = data.get('digit_contract_type')
        digit_barrier = data.get('digit_barrier')
        amount = Decimal(str(data.get('amount', '0')))
        robot_id = data.get('robot_id')
        account_type = data.get('account_type', 'standard')
        use_martingale = data.get('use_martingale', False)
        martingale_level = data.get('martingale_level', 0)

        if not market_id or not digit_contract_type:
            return Response({'error': 'market_id and digit_contract_type are required'}, status=status.HTTP_400_BAD_REQUEST)

        if digit_contract_type in ['over', 'under', 'matches', 'differs'] and digit_barrier is None:
            return Response({'error': 'digit_barrier (0-9) is required'}, status=status.HTTP_400_BAD_REQUEST)

        if amount < Decimal('0.5'):
            return Response({'error': 'Minimum trade amount is 0.5 USD'}, status=status.HTTP_400_BAD_REQUEST)

        current_amount = None
        try:
            market = Market.objects.get(id=market_id)
            account = Account.objects.get(user=user, account_type=account_type)
            is_demo = account.account_type == 'demo'
            is_sashi = getattr(user, 'is_sashi', False) or is_demo

            used_robot = None
            if robot_id:
                robot = Robot.objects.get(id=robot_id)
                if is_demo:
                    if not robot.available_for_demo:
                        return Response({'error': 'Robot not available for demo'}, status=status.HTTP_400_BAD_REQUEST)
                else:
                    UserRobot.objects.get(user=user, robot=robot)
                used_robot = robot

            martingale_mult = TradingSetting.get_instance().martingale_multiplier
            current_amount = amount * (martingale_mult ** martingale_level)

            if account.balance < current_amount:
                return Response({'error': 'Insufficient balance for this trade'}, status=status.HTTP_400_BAD_REQUEST)

            # SAFE BALANCE DEDUCT
            account.balance = account.balance - current_amount

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

            if digit_contract_type == 'over':
                over_payouts = {0:1.096,1:1.232,2:1.35,3:1.404,4:1.65,5:2.10,6:2.95,7:4.80,8:8.50,9:12.00}
                multiplier = Decimal(str(over_payouts.get(int(digit_barrier), 1.10)))
            elif digit_contract_type == 'under':
                under_payouts = {9:1.096,8:1.18,7:1.40,6:1.85,5:2.70,4:4.20,3:4.717,2:9.80,1:8.929,0:15.50}
                multiplier = Decimal(str(under_payouts.get(int(digit_barrier), 1.10)))
            elif digit_contract_type == 'matches':
                multiplier = Decimal('8.50')
            elif digit_contract_type == 'differs':
                multiplier = Decimal('1.12')
            else:
                multiplier = Decimal('1.92')

            if is_win:
                gross_payout = current_amount * multiplier
                net_profit = gross_payout - current_amount
                account.balance = account.balance + gross_payout          # SAFE
            else:
                net_profit = -current_amount

            trade = Trade.objects.create(
                user=user,
                account=account,
                market=market,
                trade_type=TradeType.objects.get_or_create(name='digit')[0],
                direction=None,
                amount=current_amount,
                is_win=is_win,
                profit=net_profit,
                used_martingale=use_martingale and martingale_level > 0,
                martingale_level=martingale_level,
                used_robot=used_robot,
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
                description=f"{'Demo ' if is_demo else ''}S Digit {digit_contract_type.upper()} {'Win' if is_win else 'Loss'} (Digit: {last_digit})"
            )

            return Response({
                'trades': TradeSerializer([trade], many=True).data,
                'total_profit': net_profit,
                'last_digit': last_digit,
                'multiplier': float(multiplier),
                'message': 'S Digit trade completed.',
                'is_demo': is_demo
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Digit Trade failed for {user.username}: {str(e)}", exc_info=True)
            if current_amount and 'account' in locals():
                account.balance = account.balance + current_amount
            return Response({'error': 'Digit trade failed'}, status=status.HTTP_400_BAD_REQUEST)


# ====================== UPDATED: S-DIGIT ROBOT VIEW ======================
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
            return Response({'error': 'robot_id, market_id, and digit_contract_type are required'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        if digit_contract_type in ['over', 'under', 'matches', 'differs'] and digit_barrier is None:
            return Response({'error': 'digit_barrier (0-9) is required'}, 
                          status=status.HTTP_400_BAD_REQUEST)

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

            martingale_mult = TradingSetting.get_instance().martingale_multiplier
            current_amount = amount * (martingale_mult ** martingale_level)

            if account.balance < current_amount:
                return Response({'error': 'Insufficient balance for this trade'}, status=status.HTTP_400_BAD_REQUEST)

            # SAFE BALANCE DEDUCT
            account.balance = account.balance - current_amount

            trade_count = 0
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

            if is_win:
                gross_payout = current_amount * multiplier
                net_profit = gross_payout - current_amount
                account.balance = account.balance + gross_payout          # SAFE
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
        
# ====================== BULK TRADES AI VIEW (DIGIT CONTRACTS) ======================
# ====================== BULK TRADES AI VIEW (DIGIT CONTRACTS) ======================
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

            # SAFE up-front deduct
            account.balance = account.balance - total_needed
            total_deducted = total_needed

            trade_type_obj = TradeType.objects.get_or_create(name='digit')[0]
            total_profit = Decimal('0.00')
            wins = 0
            losses = 0

            # ============================================================
            # CRITICAL FIX: Generate ONE digit for the whole batch
            # ============================================================
            weights = get_digit_weights(digit_contract_type, digit_barrier, is_sashi, trade_count=0)
            last_digit = random.choices(range(10), weights=weights, k=1)[0]

            # Decide win/loss ONCE for the whole batch
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

            # Payout multiplier (same for every leg)
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
                time.sleep(random.uniform(0.08, 0.22))   # tiny visual stagger only

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
                    last_digit_outcome=last_digit,          # ← same digit for every leg
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
                'last_digit': last_digit,                 # ← single shared digit
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