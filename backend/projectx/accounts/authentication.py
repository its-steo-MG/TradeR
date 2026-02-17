# accounts/authentication.py
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.utils.translation import gettext_lazy as _
from .models import User

class SuspendedUserJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if user:
            # Clean up expired temp suspensions
            user.clean_up_expired_suspension()
            if user.is_suspended:
                raise AuthenticationFailed(
                    detail=_("Account is suspended."),
                    code='suspended'
                )
        return user