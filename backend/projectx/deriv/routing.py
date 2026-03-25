from django.urls import path
from .consumers import DerivTicksConsumer

websocket_urlpatterns = [
    path('ws/deriv/ticks/', DerivTicksConsumer.as_asgi()),
]