# traderpulse/apps.py
from django.apps import AppConfig

class TraderpulseConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'traderpulse'

    def ready(self):
        # DO NOT start Celery tasks here on Windows/dev
        # Let Celery worker start the pulse via task or management command
        pass