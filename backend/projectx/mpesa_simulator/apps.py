# mpesa_simulator/apps.py
from django.apps import AppConfig

class MpesaSimulatorConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'mpesa_simulator'

    def ready(self):
        import mpesa_simulator.signals  # Connect signals