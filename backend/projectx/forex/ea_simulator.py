import random
from decimal import Decimal
from django.utils import timezone
from django.db import transaction

from .models import UserRobot, Position, BotLog
from wallet.models import Wallet, Currency
from accounts.models import Account


def run_ea_step(user_robot: UserRobot):
    """
    EA Robot - Matches Frontend MT5 EA Behavior
    - Opens batch when no positions
    - Closes only when in profit (Sashi gets better conditions)
    """
    if not user_robot.is_running or not user_robot.is_ea:
        return

    user = user_robot.user
    is_sashi = getattr(user, 'is_sashi', False)
    pair = user_robot.selected_pair
    timeframe = user_robot.timeframe or 'M1'

    if not pair:
        BotLog.objects.create(user_robot=user_robot, message="No pair selected. Stopping EA.")
        user_robot.is_running = False
        user_robot.save()
        return

    # Only allow EA on MT5
    mt5_account = user.accounts.filter(platform='mt5').first()
    if not mt5_account:
        BotLog.objects.create(user_robot=user_robot, message="❌ EA only works on MT5. Stopping.")
        user_robot.is_running = False
        user_robot.save()
        return

    account = mt5_account
    usd = Currency.objects.get(code='USD')
    wallet = Wallet.objects.get(account=account, wallet_type='main', currency=usd)

    # Get current EA positions
    recent_positions = Position.objects.filter(ea_robot=user_robot, status='open')
    open_count = recent_positions.count()

    BotLog.objects.create(
        user_robot=user_robot,
        message=f"EA running on MT5 | Open positions: {open_count}"
    )

    # Target profit check
    if user_robot.target_profit and wallet.balance >= user_robot.target_profit:
        BotLog.objects.create(user_robot=user_robot, message=f"🎯 Target profit reached. Stopping EA.")
        user_robot.is_running = False
        user_robot.save()
        return

    # 1. Open new batch if no positions
    if open_count == 0:
        BotLog.objects.create(user_robot=user_robot, message=f"Opening new batch of {user_robot.max_open_positions} positions...")

        try:
            with transaction.atomic():
                direction = random.choice(['buy', 'sell'])
                entry_price = pair.get_current_price(time_frame=timeframe)

                for i in range(user_robot.max_open_positions):
                    initial_loss = Decimal('-8.00') if is_sashi else Decimal('-14.00')

                    position = Position.objects.create(
                        user=user,
                        account=account,
                        pair=pair,
                        direction=direction,
                        volume_lots=Decimal('0.01'),
                        entry_price=entry_price,
                        floating_p_l=initial_loss,
                        status='open',
                        leverage=500,
                        time_frame=timeframe,
                        ea_robot=user_robot,
                    )

                    margin = position.calculate_margin()
                    if wallet.balance >= margin:
                        wallet.balance -= margin
                        wallet.save()

                BotLog.objects.create(
                    user_robot=user_robot,
                    message=f"✅ Opened batch of {user_robot.max_open_positions} {direction.upper()} positions"
                )

        except Exception as e:
            BotLog.objects.create(user_robot=user_robot, message=f"Error opening batch: {str(e)}")

    # 2. Monitor and close positions (only when profitable)
    for pos in list(recent_positions):
        try:
            current_price = pos.pair.get_current_price(
                entry_time=pos.entry_time,
                is_sashi=is_sashi,
                direction=pos.direction,
                time_frame=pos.time_frame
            )

            pos.update_floating_p_l(current_price)

            seconds_open = (timezone.now() - pos.entry_time).total_seconds()

            if seconds_open >= 5:
                profit = pos.floating_p_l

                # Close only when in profit
                if is_sashi:
                    if profit > Decimal('0.70'):   # Sashi closes earlier on profit
                        pos.close_position(current_price, is_auto=True, close_reason='ea_take_profit')
                        BotLog.objects.create(
                            user_robot=user_robot,
                            message=f"✅ Sashi EA Closed profitable position → +${profit:.2f}",
                            trade_result='win',
                            profit_loss=profit
                        )
                else:
                    if profit > Decimal('1.80'):   # Normal user needs higher profit
                        pos.close_position(current_price, is_auto=True, close_reason='ea_take_profit')
                        BotLog.objects.create(
                            user_robot=user_robot,
                            message=f"✅ EA Closed profitable position → +${profit:.2f}",
                            trade_result='win',
                            profit_loss=profit
                        )

        except Exception as e:
            BotLog.objects.create(user_robot=user_robot, message=f"Error monitoring position: {str(e)}")

    # Heartbeat
    if random.random() < 0.08:
        BotLog.objects.create(
            user_robot=user_robot,
            message=f"EA cycle completed. Open positions: {open_count}"
        )