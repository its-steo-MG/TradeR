from django.apps import AppConfig


class BinanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'binance'

    def ready(self):
        import binance.signals
