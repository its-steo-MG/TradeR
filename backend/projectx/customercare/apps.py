# customercare/apps.py
from django.apps import AppConfig

class CustomercareConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'customercare'

    def ready(self):
        import customercare.signals  # noqa: F401