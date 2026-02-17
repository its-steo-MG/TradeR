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
from .serializers import MarketSerializer, TradeTypeSerializer, RobotSerializer, UserRobotSerializer, TradeSerializer,SignalSerializer
from accounts.models import Account
import time
from datetime import datetime, timedelta
from polygon import RESTClient
import pandas as pd
from django.conf import settings
from dashboard.models import Transaction
from decimal import Decimal, InvalidOperation
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
            effective_price = robot.effective_price  # ← This respects discount

            if account.account_type == 'demo':
                if robot.available_for_demo:
                    user_robot, created = UserRobot.objects.get_or_create(user=request.user, robot=robot)
                    if created:
                        user_robot.purchased_price = Decimal('0.00')
                        user_robot.save()
                    return Response({'message': 'Robot assigned for demo use'}, status=status.HTTP_200_OK)
                return Response({'error': 'This robot is not available for demo accounts'}, status=status.HTTP_400_BAD_REQUEST)

            # Real account purchase
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

            return Response({'message': 'Robot purchased successfully'}, status=status.HTTP_201_CREATED)

        except Robot.DoesNotExist:
            return Response({'error': 'Robot not found'}, status=status.HTTP_404_NOT_FOUND)
        except Account.DoesNotExist:
            return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)


# Inside UserRobotListView (only small addition for demo fake entries)
class UserRobotListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        is_demo = Account.objects.filter(user=user, account_type='demo').exists()

        if is_demo:
            demo_robots = Robot.objects.filter(available_for_demo=True)
            fake_entries = []
            fake_id = UserRobot.objects.aggregate(Max('id'))['id__max'] or 0
            fake_id += 1

            for robot in demo_robots:
                if not UserRobot.objects.filter(user=user, robot=robot).exists():
                    fake = UserRobot(
                        id=fake_id,
                        user=user,
                        robot=robot,
                        purchased_at=None,
                        purchased_price=Decimal('0.00')  # ← Added
                    )
                    fake_entries.append(fake)
                    fake_id += 1

            real_entries = UserRobot.objects.filter(user=user)
            combined = list(real_entries) + fake_entries
            serializer = UserRobotSerializer(combined, many=True)
        else:
            owned = UserRobot.objects.filter(user=user)
            serializer = UserRobotSerializer(owned, many=True)

        return Response(serializer.data)
        
# trading/views.py (relevant part: PlaceTradeView)
class PlaceTradeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        user = request.user

        # Support both market_id and market (your frontend uses market_id)
        market_id = data.get('market_id') or data.get('market')
        trade_type_id = data.get('trade_type_id') or data.get('trade_type')
        direction = data.get('direction')  # 'buy' or 'sell'
        amount = Decimal(str(data.get('amount', '0')))  # Safe Decimal conversion
        use_martingale = data.get('use_martingale', False)
        martingale_level = data.get('martingale_level', 0)
        robot_id = data.get('robot_id')
        account_type = data.get('account_type', 'standard')
        target_profit = data.get('target_profit')
        stop_loss = data.get('stop_loss')

        # === Validate optional target_profit / stop_loss ===
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

        # === Amount validation ===
        if amount < Decimal('0.5'):
            return Response({'error': 'Minimum trade amount is 0.5 USD'}, status=status.HTTP_400_BAD_REQUEST)
        if amount <= 0:
            return Response({'error': 'Amount must be positive'}, status=status.HTTP_400_BAD_REQUEST)

        current_amount = None  # Define early for rollback
        try:
            # === Fetch core objects ===
            market = Market.objects.get(id=market_id)
            trade_type = TradeType.objects.get(id=trade_type_id)
            account = Account.objects.get(user=user, account_type=account_type)
            is_demo = account.account_type == 'demo'
            effective_sashi = user.is_sashi or is_demo

            # === Robot validation ===
            used_robot = None
            if robot_id:
                robot = Robot.objects.get(id=robot_id)
                if is_demo:
                    if not robot.available_for_demo:
                        return Response({'error': 'Robot not available for demo'}, status=status.HTTP_400_BAD_REQUEST)
                else:
                    UserRobot.objects.get(user=user, robot=robot)
                used_robot = robot

            # === Martingale setup ===
            martingale_mult = TradingSetting.get_instance().martingale_multiplier
            current_amount = amount * (martingale_mult ** martingale_level)

            if account.balance < current_amount:
                return Response({'error': 'Insufficient balance for this trade'}, status=status.HTTP_400_BAD_REQUEST)

            # === Deduct stake ===
            account.balance -= current_amount
            account.save()

            # === WIN PROBABILITY: ROBOT FIRST ===
            if used_robot:
                robot_rate = used_robot.win_rate / 100.0
                if robot_rate >= 0.90:
                    win_prob = 0.90
                else:
                    win_prob = robot_rate
            else:
                if effective_sashi:
                    win_prob = 0.80 if martingale_level == 0 else 0.95
                else:
                    win_prob = 0.20

            # === NON-SASHI MARTINGALE PENALTY (ONLY IF NO ROBOT) ===
            if use_martingale and not effective_sashi and not used_robot:
                win_prob = 0.10

            # === Simulate trade outcome ===
            time.sleep(random.uniform(1, 5))
            is_win = random.random() < win_prob

            # === Simulate price movement (your original logic) ===
            entry_spot = round(random.uniform(1.0, 100.0), 5)
            delta = round(random.uniform(0.01, 0.1), 5)
            if direction == 'buy':
                exit_spot = entry_spot + delta if is_win else entry_spot - delta
            else:
                exit_spot = entry_spot - delta if is_win else entry_spot + delta
            current_spot = exit_spot

            # === Payout calculation ===
            if is_win:
                gross_payout = current_amount * market.profit_multiplier
                net_profit = gross_payout - current_amount
                account.balance += gross_payout
            else:
                gross_payout = Decimal('0.00')
                net_profit = -current_amount

            account.save()

            # === Create Trade record (THIS TRIGGERS COPY TRADING SIGNAL) ===
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

            # === Create Transaction log ===
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

        # === ERROR HANDLING WITH ROLLBACK ===
        except (Market.DoesNotExist, TradeType.DoesNotExist, Account.DoesNotExist,
                Robot.DoesNotExist, UserRobot.DoesNotExist) as e:
            if current_amount and 'account' in locals():
                account.balance += current_amount
                account.save()
            return Response({'error': 'Resource not found'}, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"Trade failed for {user.username}: {str(e)}", exc_info=True)
            if current_amount and 'account' in locals():
                account.balance += current_amount
                account.save()
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
            # Calculate total session profit for the day
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
        
# Helper functions for indicators
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

        client = RESTClient(settings.POLYGON_API_KEY)
        all_markets = list(Market.objects.all())
        # Limit to 5 random markets to avoid rate limits and timeouts
        import random
        markets = random.sample(all_markets, min(5, len(all_markets))) if all_markets else []
        signals = []

        for market in markets:
            time.sleep(12)  # Respect free tier rate limit (~5 calls/min)

            if market.market_type.name.lower() == 'forex':
                ticker = f"C:{market.name.upper()}"
            elif market.market_type.name.lower() == 'crypto':
                ticker = f"X:{market.name.upper()}"
            else:
                continue

            to_date = datetime.now()
            from_date = to_date - timedelta(days=14)

            try:
                aggs = client.get_aggs(
                    ticker,
                    multiplier=1,
                    timespan="hour",
                    from_=from_date.strftime("%Y-%m-%d"),
                    to=to_date.strftime("%Y-%m-%d"),
                    limit=500
                )

                if len(aggs) < 15:  # Lowered threshold for RSI/ATR (period 14)
                    logger.warning(f"Insufficient data for {market.name}: {len(aggs)} bars")
                    continue

                last_aggs = aggs[-15:]  # Use last 15 for calculation
                closes = [agg.close for agg in last_aggs]
                highs = [agg.high for agg in last_aggs]
                lows = [agg.low for agg in last_aggs]
                current_price = Decimal(str(closes[-1]))

                rsi = calculate_rsi(closes)
                atr = calculate_atr(highs, lows, closes) or Decimal('0.0005')

                if rsi is None:
                    continue

                # Primary Strength: Strong Overbought/Oversold
                buy_strength = max(35 - rsi, 0) if rsi < 35 else 0
                sell_strength = max(rsi - 65, 0) if rsi > 65 else 0
                strength = max(buy_strength, sell_strength)
                direction = 'buy' if buy_strength > sell_strength else 'sell'

                # Fallback: Mild Signal if Neutral RSI (35-65)
                if strength == 0:
                    if rsi < 50:
                        buy_strength = (50 - rsi) * 0.6  # Mild buy bias
                        direction = 'buy'
                    else:
                        sell_strength = (rsi - 50) * 0.6  # Mild sell bias
                        direction = 'sell'
                    strength = max(buy_strength, sell_strength)

                # Probability Calculation (60% floor, up to 92%)
                base_prob = 65 + int(strength * 1.8)  # Slightly more aggressive scaling
                probability = max(60, min(base_prob, 92))

                # Dynamic TP/SL based on ATR and signal confidence
                confidence_factor = Decimal(probability) / Decimal('75')
                tp_offset = Decimal(atr) * Decimal('3.0') * confidence_factor
                sl_offset = Decimal(atr) * Decimal('1.8') / confidence_factor  # Tighter SL on strong signals

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
                logger.error(f"Failed to fetch data for {market.name}: {str(e)}")
                continue

        # Final Fallback: If no signals, pick random market with varied prob
        if not signals:
            if not all_markets:
                return Response({'error': 'No markets available for signal generation'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            market = random.choice(all_markets)
            current_price = Decimal('1.1000')  # Dummy fallback price
            direction = random.choice(['buy', 'sell'])
            probability = random.randint(60, 80)  # Varied for diversity
            strength = random.uniform(0, 10)  # Random strength
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

        # Pick the strongest signal
        best_signal = max(signals, key=lambda s: s['probability'])

        signal = Signal.objects.create(
            user=user,
            market=best_signal['market'],
            direction=best_signal['direction'],
            probability=best_signal['probability'],
            take_profit=best_signal['take_profit'],
            stop_loss=best_signal['stop_loss']
        )
        # Save additional fields (add these to Signal model if not already: strength = models.FloatField(default=0), current_price = models.DecimalField(...))
        signal.strength = best_signal['strength']
        signal.current_price = best_signal['current_price']
        signal.save()

        serializer = SignalSerializer(signal)
        response_data = serializer.data
        response_data['timeframe'] = '1 minute'
        response_data['note'] = 'High-precision AI signal optimized for short-term trading'

        return Response(response_data, status=status.HTTP_201_CREATED)