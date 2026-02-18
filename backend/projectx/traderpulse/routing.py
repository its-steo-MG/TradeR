# traderpulse/routing.py
from django.urls import re_path
from .consumers import PulseConsumer

websocket_urlpatterns = [
    re_path(r'ws/traderpulse/$', PulseConsumer.as_asgi()),
]