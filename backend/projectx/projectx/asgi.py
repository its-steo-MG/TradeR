"""
ASGI config for projectx
"""

import os
import sys
import asyncio
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from channels.auth import AuthMiddlewareStack

# Windows fix
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'projectx.settings')

django.setup()

django_asgi_app = get_asgi_application()

# ====================== IMPORTS ======================
from customercare.middleware import QueryStringJWTAuthMiddleware

import customercare.routing
import traderpulse.routing
import deriv.routing

websocket_urlpatterns = (
    customercare.routing.websocket_urlpatterns +
    traderpulse.routing.websocket_urlpatterns +
    deriv.routing.websocket_urlpatterns
)

# ====================== APPLICATION ======================
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        QueryStringJWTAuthMiddleware(
            AuthMiddlewareStack(
                URLRouter(websocket_urlpatterns)
            )
        )
    ),
})