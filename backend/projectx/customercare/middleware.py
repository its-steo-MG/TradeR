# customercare/middleware.py
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
import logging

logger = logging.getLogger(__name__)

@database_sync_to_async
def get_user_from_token(token_str: str):
    if not token_str:
        logger.warning("[Auth] No token provided")
        return AnonymousUser()

    try:
        authenticator = JWTAuthentication()
        validated_token = authenticator.get_validated_token(token_str.encode('utf-8'))
        user = authenticator.get_user(validated_token)

        if user.is_authenticated:
            logger.info(f"[Auth] ✅ Token valid → User: {user.username} (ID: {user.id})")
            return user
        else:
            logger.warning("[Auth] Token valid but user not authenticated")
            return AnonymousUser()

    except (InvalidToken, TokenError) as e:
        logger.warning(f"[Auth] ❌ Invalid/expired token: {str(e)[:80]}...")
        return AnonymousUser()
    except Exception as e:
        logger.error(f"[Auth] Unexpected token validation error: {e}", exc_info=True)
        return AnonymousUser()


class QueryStringJWTAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode("utf-8")
        query_params = parse_qs(query_string)
        token = query_params.get("token", [None])[0]

        user = await get_user_from_token(token)
        scope["user"] = user

        return await self.app(scope, receive, send)