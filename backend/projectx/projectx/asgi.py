"""
ASGI config for projectx (Traderiser)
- HTTP → Django views
- WebSocket → JWT auth + customercare + traderpulse + deriv ticks
"""

import os

# Set settings first
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'projectx.settings')

# Import Django ASGI once
from django.core.asgi import get_asgi_application
django_asgi_app = get_asgi_application()

# Channels imports
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

# Your middlewares and routings
from customercare.middleware import QueryStringJWTAuthMiddleware
import customercare.routing
import traderpulse.routing
import deriv.routing   # ← your deriv app

application = ProtocolTypeRouter({
    # HTTP - Use the SAME instance we created above
    "http": django_asgi_app,

    # WebSocket with your JWT middleware
    "websocket": QueryStringJWTAuthMiddleware(
        URLRouter(
            customercare.routing.websocket_urlpatterns +
            traderpulse.routing.websocket_urlpatterns +
            deriv.routing.websocket_urlpatterns
        )
    ),
})