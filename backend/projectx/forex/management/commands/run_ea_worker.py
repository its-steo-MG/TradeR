# forex/management/commands/run_ea_worker.py
from django.core.management.base import BaseCommand
from django.utils import timezone
import time
from forex.models import UserRobot
from forex.ea_simulator import run_ea_step

class Command(BaseCommand):
    help = 'Run EA simulator worker'

    def handle(self, *args, **options):
        self.stdout.write("🚀 EA Simulator Worker Started...")
        while True:
            active_eas = UserRobot.objects.filter(is_running=True, is_ea=True)
            for ur in active_eas:
                try:
                    run_ea_step(ur)
                except Exception as e:
                    print(f"EA Error for {ur}: {e}")
            time.sleep(6)   # every 6 seconds