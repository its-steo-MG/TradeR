# customercare/middleware.py
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth import get_user_model

User = get_user_model()

@database_sync_to_async
def get_user_from_token(token_str):
    try:
        # Validate token
        validated_token = JWTAuthentication().get_validated_token(token_str)
        user = JWTAuthentication().get_user(validated_token)
        return user
    except (InvalidToken, TokenError):
        return AnonymousUser()

class QueryStringJWTAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # PARSE QUERY STRING: ?token=abc123
        query_string = scope.get("query_string", b"").decode("utf-8")
        query_params = parse_qs(query_string)
        token = query_params.get("token", [None])[0]

        if token:
            user = await get_user_from_token(token)
            scope["user"] = user
            print(f"[Auth] Token valid → User: {user}")
        else:
            scope["user"] = AnonymousUser()
            print("[Auth] No token → Anonymous")

        return await self.app(scope, receive, send)