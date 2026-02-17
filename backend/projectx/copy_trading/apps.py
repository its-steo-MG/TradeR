# copy_trading/apps.py
from django.apps import AppConfig


class CopyTradingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'copy_trading'

    def ready(self):
        # This line connects all your signals (including the post_save on Trade)
        import copy_trading.signals  # ← This was missing before!