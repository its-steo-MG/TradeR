# customercare/routing.py
from django.urls import re_path
from .consumers import ChatConsumer,AdminChatConsumer,CallConsumer

websocket_urlpatterns = [
    re_path(r'ws/chat/$', ChatConsumer.as_asgi()),
    re_path(r'ws/admin-chat/$', AdminChatConsumer.as_asgi()),
    re_path(r"ws/call/$", CallConsumer.as_asgi()),
]