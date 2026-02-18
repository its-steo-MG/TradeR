# traderiser/asgi.py
"""
ASGI config for traderiser project.

- HTTP → Django views
- WebSocket → JWT auth → customercare + traderpulse routing
"""

import os

# ----------------------------------------------------------------------
# 1. Set the settings module *before* anything else
# ----------------------------------------------------------------------
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'traderiser.settings')

# ----------------------------------------------------------------------
# 2. Import Django ASGI application (loads models, settings, etc.)
# ----------------------------------------------------------------------
from django.core.asgi import get_asgi_application
django_asgi_app = get_asgi_application()          # <-- keep a reference

# ----------------------------------------------------------------------
# 3. NOW safe to import Channels & your code
# ----------------------------------------------------------------------
from channels.routing import ProtocolTypeRouter, URLRouter
from customercare.middleware import QueryStringJWTAuthMiddleware
import customercare.routing
import traderpulse.routing  # ← NEW: Import TraderPulse routing

# ----------------------------------------------------------------------
# 4. Build the final ASGI router — NOW WITH TRADERPULSE
# ----------------------------------------------------------------------
application = ProtocolTypeRouter({
    # Normal HTTP requests (DRF, templates, static, etc.)
    "http": get_asgi_application(),

    # WebSocket connections → both apps share the same JWT middleware
    "websocket": QueryStringJWTAuthMiddleware(
        URLRouter(
            customercare.routing.websocket_urlpatterns +
            traderpulse.routing.websocket_urlpatterns   # ← COMBINED
        )
    ),
})