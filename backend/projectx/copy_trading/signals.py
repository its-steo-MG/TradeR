# copy_trading/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from trading.models import Trade
from .models import Trader, TradeSignal, CopiedTrade, CopySubscription
from decimal import Decimal
from dashboard.models import Transaction
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Trade)
def create_trade_signal(sender, instance, created, **kwargs):
    if not created or instance.is_copied:
        return

    try:
        trader = Trader.objects.get(user=instance.user)
    except Trader.DoesNotExist:
        return

    logger.info(f"Trader {trader.user.username} placed a trade. Creating signal...")

    signal_direction = 'call' if instance.direction == 'buy' else 'put'

    signal = TradeSignal.objects.create(
        trader=trader,
        market=instance.market,
        trade_type=instance.trade_type,
        direction=signal_direction,
        amount=instance.amount,
        entry_spot=instance.entry_spot or Decimal('0.00000'),
        profit=instance.profit,
        is_closed=True
    )

    logger.info(f"TradeSignal created: ID {signal.id}")

    propagate_copies(signal, instance)

def propagate_copies(signal, original_trade):
    subscriptions = CopySubscription.objects.filter(
        trader=signal.trader,
        is_active=True
    ).select_related('account', 'user')

    if not subscriptions.exists():
        return

    for sub in subscriptions:
        try:
            if sub.check_drawdown() > sub.max_drawdown_percent:
                sub.is_active = False
                sub.save()
                continue

            if signal.amount <= 0:
                continue

            scale_factor = sub.allocated_amount / signal.amount
            scaled_amount = original_trade.amount * scale_factor
            scaled_profit = original_trade.profit * scale_factor

            if scaled_amount > sub.account.balance:
                scaled_amount = sub.account.balance * Decimal('0.95')
                scaled_profit = original_trade.profit * (scaled_amount / original_trade.amount)

            copied_direction = 'buy' if signal.direction == 'call' else 'sell'

            copied_trade = Trade.objects.create(
                user=sub.user,
                account=sub.account,
                market=signal.market,
                trade_type=signal.trade_type,
                direction=copied_direction,
                amount=scaled_amount,
                entry_spot=original_trade.entry_spot or Decimal('0.00000'),
                exit_spot=original_trade.exit_spot or Decimal('0.00000'),
                current_spot=original_trade.current_spot or Decimal('0.00000'),
                is_win=original_trade.is_win,
                profit=scaled_profit,
                used_martingale=False,
                martingale_level=0,
                used_robot=None,
                session_profit_before=Decimal('0.00'),
                is_demo=False,
                is_copied=True
            )

            sub.account.balance += scaled_profit
            sub.account.save()

            Transaction.objects.create(
                account=sub.account,
                amount=scaled_profit,
                transaction_type='credit' if scaled_profit > 0 else 'debit',
                description=f"Copied trade from {signal.trader.user.username} ({'Win' if scaled_profit > 0 else 'Loss'})"
            )

            copied_record = CopiedTrade.objects.create(
                subscription=sub,
                signal=signal,
                trade=copied_trade,
                scaled_amount=scaled_amount,
                profit=scaled_profit
            )

            if scaled_profit > 0:
                copied_record.calculate_fee()

        except Exception as e:
            logger.error(f"Failed to copy trade to {sub.user.username}: {str(e)}")