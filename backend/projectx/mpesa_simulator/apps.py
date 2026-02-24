# mpesa_simulator/apps.py
from django.apps import AppConfig

class MpesaSimulatorConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'mpesa_simulator'
    verbose_name = "M-Pesa Simulator"

    def ready(self):
        # This line is REQUIRED for signals to work
        import mpesa_simulator.signals  # ← THIS IS THE MISSING PIECE