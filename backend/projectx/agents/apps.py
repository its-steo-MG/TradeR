# agents/apps.py
from django.apps import AppConfig

class AgentsConfig(AppConfig):
    name = 'agents'

    def ready(self):
        import agents.signals  # Connect signals