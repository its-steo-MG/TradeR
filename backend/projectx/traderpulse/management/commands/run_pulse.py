# traderpulse/management/commands/run_pulse.py
import random
import time
from django.core.management.base import BaseCommand
from traderpulse.ai_generator import generate_ai_post, get_market_time_intensity


class Command(BaseCommand):
    help = "Keep posting fake-trader signals and trading news. Ctrl+C to stop."

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("TraderPulse bot is running. Press Ctrl+C to stop."))
        while True:
            try:
                generate_ai_post()
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"post failed: {e}"))

            level = get_market_time_intensity()
            wait = {
                "low": random.randint(20, 40),
                "medium": random.randint(8, 18),
                "high": random.randint(4, 10),
                "peak": random.randint(2, 6),
            }[level]
            time.sleep(wait)
