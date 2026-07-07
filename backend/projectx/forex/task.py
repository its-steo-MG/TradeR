# forex/task.py
from .models import UserRobot, BotLog
from wallet.models import Wallet, Currency
from dashboard.models import Transaction
from decimal import Decimal
from django.utils import timezone
import random
import time


def get_trading_account(user):
    """
    Returns MT5 account if available, otherwise Pro-FX account.
    """
    mt5_account = user.accounts.filter(platform='mt5').first()
    if mt5_account:
        return mt5_account
    return user.accounts.filter(account_type='pro-fx').first()


def perform_robot_trade(user_robot):
    try:
        robot = user_robot.robot
        user = user_robot.user
        is_sashi = getattr(user, 'is_sashi', False)
        win_rate = robot.win_rate_sashi if is_sashi else robot.win_rate_normal

        stake = user_robot.stake_per_trade
        account = get_trading_account(user)

        if not account:
            BotLog.objects.create(
                user_robot=user_robot,
                message="No trading account found. Stopping robot."
            )
            user_robot.is_running = False
            user_robot.save()
            return

        usd = Currency.objects.get(code='USD')
        wallet = Wallet.objects.get(account=account, wallet_type='main', currency=usd)

        if wallet.balance < stake:
            BotLog.objects.create(
                user_robot=user_robot,
                message=f"Insufficient balance: ${wallet.balance} < ${stake}. Stopping."
            )
            user_robot.is_running = False
            user_robot.save()
            return

        # Logs
        BotLog.objects.create(user_robot=user_robot, message="Analyzing market conditions...")
        time.sleep(random.uniform(1, 3))

        BotLog.objects.create(user_robot=user_robot, message="Entering trade...")

        # Deduct stake
        wallet.balance -= stake
        wallet.save()
        BotLog.objects.create(user_robot=user_robot, message=f"Stake deducted: ${stake}")

        time.sleep(random.uniform(2, 8))

        # Trade result
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
        BotLog.objects.create(user_robot=user_robot, message=f"Error: {str(e)}")