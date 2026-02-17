# management/management/commands/run_daily_trades.py

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from django.core.mail import send_mail
from django.conf import settings
from management.models import ManagementRequest
from wallet.models import Wallet, Currency
from dashboard.models import Transaction
from decimal import Decimal
import random
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Simulate one full day of trading with realistic small PnL (±2 to ±10)'

    def handle(self, *args, **options):
        today = timezone.now().date()
        active_requests = ManagementRequest.objects.filter(status='active')

        if not active_requests.exists():
            self.stdout.write("No active management requests today.")
            return

        try:
            usd = Currency.objects.get(code='USD')
        except Currency.DoesNotExist:
            self.stdout.write(self.style.ERROR("USD currency not found!"))
            return

        processed = 0
        completed_today = []

        for req in active_requests:
            try:
                account = req.user.accounts.get(account_type=req.account_type)
                wallet = account.wallets.get(wallet_type='main', currency=usd)

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
                        f"TradeRiser Team",
                        settings.DEFAULT_FROM_EMAIL,
                        [req.user.email],
                        fail_silently=False,
                    )
                    self.stdout.write(self.style.WARNING(f"FAILED (zero balance): {req.management_id}"))
                    continue

                daily_pnl = Decimal('0.00')
                num_trades_today = random.randint(15, 30)  # Realistic number of small trades per day

                for _ in range(num_trades_today):
                    if wallet.balance <= Decimal('0.00'):
                        break

                    base_amount = Decimal(random.randint(2, 10))

                    is_sashi = getattr(req.user, 'is_sashi', False)
                    win_rate = 1.0 if is_sashi else 0.10
                    is_win = random.random() < win_rate

                    pnl = base_amount if (is_sashi or is_win) else -base_amount

                    # Cap to not exceed target
                    remaining = req.target_profit - (req.current_pnl + daily_pnl)
                    if pnl > remaining > 0:
                        pnl = remaining

                    daily_pnl += pnl

                    with transaction.atomic():
                        wallet.balance += pnl
                        wallet.save()
                        Transaction.objects.create(
                            account=account,
                            amount=pnl if pnl > 0 else -abs(pnl),
                            transaction_type='credit' if pnl > 0 else 'debit',
                            description=f"Daily management {'profit' if pnl > 0 else 'loss'} ({abs(pnl)}) - {req.management_id}"
                        )

                req.current_pnl += daily_pnl
                req.save()

                if req.current_pnl >= req.target_profit:
                    req.status = 'completed'
                    req.save()
                    completed_today.append(req)

                self.stdout.write(
                    self.style.SUCCESS(
                        f"{req.management_id}: Daily {'+' if daily_pnl > 0 else ''}{daily_pnl} | Total PnL: ${req.current_pnl}"
                    )
                )
                processed += 1

            except Exception as e:
                logger.error(f"Error on {req.management_id}: {e}")

        # Completion emails
        for req in completed_today:
            send_mail(
                "🎉 Management Target Achieved!",
                f"Hi {req.user.username},\n\n"
                f"CONGRATULATIONS! Your target profit has been reached.\n\n"
                f"Management ID: {req.management_id}\n"
                f"Final Profit: ${req.current_pnl:.2f}\n"
                f"Target: ${req.target_profit}\n\n"
                f"Profits available now.\nThank you!\n\nTradeRiser Team",
                settings.DEFAULT_FROM_EMAIL,
                [req.user.email],
                fail_silently=False,
            )

        self.stdout.write(self.style.SUCCESS(f"Done: {processed} processed, {len(completed_today)} completed today."))