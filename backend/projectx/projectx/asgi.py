"""
ASGI config for projectx (Traderiser)
- HTTP → Django views
- WebSocket → JWT auth + customercare + traderpulse + deriv ticks
"""

import os

# ----------------------------------------------------------------------
# 1. Set the settings module *before* anything else
# ----------------------------------------------------------------------
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'projectx.settings')

# ----------------------------------------------------------------------
# 2. Import Django ASGI application first
# ----------------------------------------------------------------------
from django.core.asgi import get_asgi_application
django_asgi_app = get_asgi_application()

# ----------------------------------------------------------------------
# 3. NOW import Channels and all routing (safe after Django is loaded)
# ----------------------------------------------------------------------
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

# Import your existing middlewares and routings
from customercare.middleware import QueryStringJWTAuthMiddleware
import customercare.routing
import traderpulse.routing

# NEW: Import Deriv routing
import deriv.routing

# ----------------------------------------------------------------------
# 4. Build the final ASGI application
# ----------------------------------------------------------------------
application = ProtocolTypeRouter({
    # HTTP requests (REST API, admin, static files, etc.)
    "http": get_asgi_application(),

    # WebSocket connections with JWT authentication
    "websocket": QueryStringJWTAuthMiddleware(
        URLRouter(
            # Keep all your existing WebSocket routes
            customercare.routing.websocket_urlpatterns +
            traderpulse.routing.websocket_urlpatterns +
            
            # NEW: Deriv Ticks WebSocket route
            deriv.routing.websocket_urlpatterns
        )
    ),
})