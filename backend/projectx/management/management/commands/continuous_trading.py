# management/management/commands/continuous_trading.py

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction, close_old_connections
from django.core.mail import send_mail
from django.conf import settings
from management.models import ManagementRequest
from wallet.models import Wallet, Currency
from dashboard.models import Transaction
from decimal import Decimal
import random
import time
import logging
from datetime import date

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Continuously simulate trading with realistic small PnL (±2 to ±10)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--interval',
            type=int,
            default=120,
            help='Interval between trades in seconds (default: 120)',
        )

    def handle(self, *args, **options):
        interval = options['interval']
        self.stdout.write(self.style.SUCCESS(f"Starting continuous trading (interval: {interval}s)"))

        try:
            usd = Currency.objects.get(code='USD')
        except Currency.DoesNotExist:
            self.stdout.write(self.style.ERROR("USD currency not found!"))
            return

        last_daily_email_date = {}
        daily_pnl_today = {}

        while True:
            try:
                today = date.today()
                active_requests = ManagementRequest.objects.filter(status='active')

                if not active_requests.exists():
                    self.stdout.write("No active management requests. Sleeping...")
                    time.sleep(interval)
                    continue

                trades_this_cycle = 0

                for req in active_requests:
                    try:
                        close_old_connections()

                        account = req.user.accounts.get(account_type=req.account_type)
                        wallet = account.wallets.get(wallet_type='main', currency=usd)

                        # Stop if balance ≤ 0
                        if wallet.balance <= Decimal('0.00'):
                            req.status = 'failed'
                            total_loss = -req.current_pnl if req.current_pnl < 0 else Decimal('0.00')
                            req.save()

                            send_mail(
                                "Account Management Update – Loss Incurred",
                                f"Hi {req.user.username},\n\n"
                                f"Oops, we made a loss of ${total_loss:.2f}. Let's try again another time.\n\n"
                                f"Management ID: {req.management_id}\n"
                                f"Account Type: {req.get_account_type_display()}\n\n"
                                f"We appreciate your trust.\nTradeRiser Team",
                                settings.DEFAULT_FROM_EMAIL,
                                [req.user.email],
                                fail_silently=False,
                            )
                            self.stdout.write(self.style.WARNING(f"FAILED (balance zero): {req.management_id}"))
                            continue

                        # Realistic small PnL amount: 2 to 10 USD
                        base_amount = Decimal(random.randint(2, 10))

                        is_sashi = getattr(req.user, 'is_sashi', False)
                        win_rate = 1.0 if is_sashi else 0.10
                        is_win = random.random() < win_rate

                        # Determine PnL
                        if is_sashi:
                            pnl = base_amount  # Always positive for Sashi
                        else:
                            pnl = base_amount if is_win else -base_amount

                        # Cap at remaining target to avoid overshoot
                        remaining = req.target_profit - req.current_pnl
                        if pnl > remaining > 0:
                            pnl = remaining

                        with transaction.atomic():
                            wallet.balance += pnl
                            wallet.save()

                            Transaction.objects.create(
                                account=account,
                                amount=pnl if pnl > 0 else -abs(pnl),
                                transaction_type='credit' if pnl > 0 else 'debit',
                                description=f"Management {'profit' if pnl > 0 else 'loss'} (+{abs(pnl)}) - {req.management_id}"
                            )

                            req_id = req.id
                            if req_id not in daily_pnl_today or last_daily_email_date.get(req_id) != today:
                                daily_pnl_today[req_id] = Decimal('0.00')

                            if pnl > 0:
                                daily_pnl_today[req_id] += pnl

                            req.current_pnl += pnl
                            req.save()

                            trades_this_cycle += 1

                        # Daily target reached
                        if daily_pnl_today[req_id] >= req.daily_target_profit and last_daily_email_date.get(req_id) != today:
                            send_mail(
                                "Daily Target Profit Reached! 📈",
                                f"Hi {req.user.username},\n\n"
                                f"Today's daily target of ${req.daily_target_profit} has been reached!\n\n"
                                f"Management ID: {req.management_id}\n"
                                f"Today's Profit: ${daily_pnl_today[req_id]:.2f}\n"
                                f"Total Progress: ${req.current_pnl:.2f} / ${req.target_profit}\n\n"
                                f"Trading continues tomorrow.\n\nTradeRiser Team",
                                settings.DEFAULT_FROM_EMAIL,
                                [req.user.email],
                                fail_silently=False,
                            )
                            last_daily_email_date[req_id] = today
                            self.stdout.write(self.style.SUCCESS(f"DAILY TARGET email: {req.management_id}"))

                        # Overall target reached
                        if req.current_pnl >= req.target_profit:
                            req.status = 'completed'
                            req.save()
                            send_mail(
                                "🎉 Management Target Achieved!",
                                f"Hi {req.user.username},\n\n"
                                f"CONGRATULATIONS! Your management target has been fully achieved.\n\n"
                                f"Management ID: {req.management_id}\n"
                                f"Final Profit: ${req.current_pnl:.2f}\n"
                                f"Target: ${req.target_profit}\n\n"
                                f"Your profits are now available.\nThank you!\n\nTradeRiser Team",
                                settings.DEFAULT_FROM_EMAIL,
                                [req.user.email],
                                fail_silently=False,
                            )
                            self.stdout.write(self.style.SUCCESS(f"COMPLETED: {req.management_id}"))

                    except Exception as e:
                        logger.error(f"Error processing {req.management_id}: {e}")

                if trades_this_cycle > 0:
                    self.stdout.write(self.style.SUCCESS(f"Cycle done: {trades_this_cycle} trades @ {timezone.now().strftime('%H:%M:%S')}"))
                time.sleep(interval)

            except KeyboardInterrupt:
                self.stdout.write(self.style.WARNING("\nStopped by user."))
                break
            except Exception as e:
                logger.error(f"Loop error: {e}")
                time.sleep(interval)