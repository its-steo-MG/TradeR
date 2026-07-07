# forex/management/commands/run_ea_worker.py
from django.core.management.base import BaseCommand
from django.utils import timezone
import time
import asyncio
from forex.models import UserRobot
from forex.ea_simulator import run_ea_step

class Command(BaseCommand):
    help = 'Run EA simulator worker - Robust version for Render'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("🚀 EA Simulator Worker Started on Render..."))
        self.stdout.write("✅ Will check active EAs every 6 seconds")
        
        loop_count = 0
        
        while True:
            loop_count += 1
            try:
                active_eas = UserRobot.objects.filter(is_running=True, is_ea=True)
                
                if active_eas.exists():
                    self.stdout.write(f"🔍 Loop {loop_count} | Found {active_eas.count()} active EA(s)")
                    for ur in active_eas:
                        try:
                            run_ea_step(ur)
                        except Exception as ea_error:
                            self.stdout.write(self.style.ERROR(f"❌ EA Error for {ur.id} - {ur}: {ea_error}"))
                else:
                    if loop_count % 10 == 0:  # Log every 10 loops to avoid spam
                        self.stdout.write("😴 No active EAs running at the moment...")
                
                # Heartbeat so Render knows the worker is alive
                if loop_count % 5 == 0:
                    self.stdout.write(self.style.SUCCESS(f"❤️ Heartbeat - Worker still alive (loop {loop_count})"))

            except Exception as outer_error:
                self.stdout.write(self.style.ERROR(f"🚨 Unexpected error in main loop: {outer_error}"))
            
            # Sleep outside the try block so one bad EA doesn't kill the worker
            time.sleep(6)