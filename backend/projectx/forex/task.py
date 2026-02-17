# forex/task.py (helper functions, no Celery)
from .models import UserRobot, BotLog
from wallet.models import Wallet, Currency
from dashboard.models import Transaction
from decimal import Decimal
from django.utils import timezone
import random
import time

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

        # Simulate analysis delay
        time.sleep(random.uniform(1, 3))

        BotLog.objects.create(
            user_robot=user_robot,
            message="Entering trade..."
        )

        # Deduct stake
        wallet.balance -= stake
        wallet.save()
        BotLog.objects.create(
            user_robot=user_robot,
            message=f"Stake deducted: ${stake}"
        )

        # Simulate trading delay
        time.sleep(random.uniform(2, 10))

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