import random
from decimal import Decimal
from django.utils import timezone
from django.db import transaction

from .models import UserRobot, Position, BotLog
from wallet.models import Wallet, Currency


def run_ea_step(user_robot: UserRobot):
    """Called every ~6 seconds by the background worker for EA robots."""
    if not user_robot.is_running or not user_robot.is_ea:
        return

    user = user_robot.user
    is_sashi = getattr(user, 'is_sashi', False)
    pair = user_robot.selected_pair
    timeframe = user_robot.timeframe or 'M1'

    if not pair:
        BotLog.objects.create(
            user_robot=user_robot, 
            message="No pair selected. Stopping EA."
        )
        user_robot.is_running = False
        user_robot.save()
        return

    usd = Currency.objects.get(code='USD')
    account = user.accounts.get(account_type='pro-fx')
    wallet = Wallet.objects.get(account=account, wallet_type='main', currency=usd)

    # 1. Target profit check
    if user_robot.target_profit and wallet.balance >= user_robot.target_profit:
        BotLog.objects.create(
            user_robot=user_robot, 
            message=f"🎯 Target profit ${user_robot.target_profit} reached. EA stopped."
        )
        user_robot.is_running = False
        user_robot.save()
        return

    # 2. Get only positions opened by THIS EA (critical for proper closing)
    recent_positions = Position.objects.filter(
        ea_robot=user_robot,
        status='open'
    )
    open_count = recent_positions.count()

    # 3. Open new position if under limit
    if open_count < user_robot.max_open_positions:
        BotLog.objects.create(user_robot=user_robot, message="Opening new EA position...")

        try:
            with transaction.atomic():
                entry_price = pair.get_current_price(time_frame=timeframe)
                direction = random.choice(['buy', 'sell'])

                initial_loss = Decimal('-12.00') if not is_sashi else Decimal('-6.00')

                position = Position.objects.create(
                    user=user,
                    account=account,
                    pair=pair,
                    direction=direction,
                    volume_lots=Decimal('0.01'),
                    entry_price=entry_price,
                    sl=None,
                    tp=None,
                    floating_p_l=initial_loss,
                    status='open',
                    leverage=500,
                    time_frame=timeframe,
                    ea_robot=user_robot,          # ← VERY IMPORTANT
                )

                margin = position.calculate_margin()
                if wallet.balance >= margin:
                    wallet.balance -= margin
                    wallet.save()

            BotLog.objects.create(
                user_robot=user_robot,
                message=f"EA Position #{position.id} opened → {pair.name} {direction.upper()} @ {entry_price}"
            )

        except Exception as e:
            BotLog.objects.create(
                user_robot=user_robot,
                message=f"Error opening EA position: {str(e)}"
            )

    # 4. Monitor and auto-close positions opened by this EA
    for pos in list(recent_positions):   # use list() to avoid queryset modification issues
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
                if is_sashi:
                    # Sashi users → higher win probability
                    if pos.floating_p_l > Decimal('0.80'):
                        profit_before = pos.floating_p_l
                        pos.close_position(current_price, is_auto=True, close_reason='ea_take_profit')
                        BotLog.objects.create(
                            user_robot=user_robot,
                            message=f"✅ EA Closed profitable position → +${profit_before:.2f}",
                            trade_result='win',
                            profit_loss=profit_before
                        )
                else:
                    # Normal users → mostly losses
                    if random.random() < 0.85:
                        if seconds_open >= 8 or pos.floating_p_l < Decimal('-4.00'):
                            loss_before = pos.floating_p_l
                            pos.close_position(current_price, is_auto=True, close_reason='ea_stop_loss')
                            BotLog.objects.create(
                                user_robot=user_robot,
                                message=f"❌ EA Closed losing position → ${loss_before:.2f}",
                                trade_result='loss',
                                profit_loss=loss_before
                            )
                    else:
                        # Rare win for normal users
                        if pos.floating_p_l > Decimal('1.50'):
                            profit_before = pos.floating_p_l
                            pos.close_position(current_price, is_auto=True, close_reason='ea_take_profit')
                            BotLog.objects.create(
                                user_robot=user_robot,
                                message=f"✅ EA Closed profitable position → +${profit_before:.2f}",
                                trade_result='win',
                                profit_loss=profit_before
                            )
        except Exception as e:
            BotLog.objects.create(
                user_robot=user_robot,
                message=f"Error monitoring position #{pos.id}: {str(e)}"
            )

    # Heartbeat log
    if random.random() < 0.10:   # less frequent
        BotLog.objects.create(
            user_robot=user_robot,
            message=f"EA cycle completed. Open positions: {open_count}"
        )