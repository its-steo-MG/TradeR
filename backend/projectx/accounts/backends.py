# accounts/backends.py

from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from rest_framework.exceptions import PermissionDenied
from django.core.exceptions import MultipleObjectsReturned

UserModel = get_user_model()

class EmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get('email')
        if username is None or password is None:
            return None
        
        try:
            user = UserModel.objects.get(email=username)
            if user.check_password(password) and self.user_can_authenticate(user):
                # ────────────────────────────────────────────────
                # FIX: Clean up but DO NOT raise here
                # Let views (e.g. LoginView) handle suspension logic
                # ────────────────────────────────────────────────
                user.clean_up_expired_suspension()
                # if user.is_suspended:  # ← COMMENT OUT
                #     raise PermissionDenied("Account is suspended.")  # ← COMMENT OUT
                
                return user
        
        except UserModel.DoesNotExist:
            pass  # Timing attack prevention
        
        except MultipleObjectsReturned:
            user = UserModel.objects.filter(email=username, is_active=True).first()
            if user and user.check_password(password) and self.user_can_authenticate(user):
                user.clean_up_expired_suspension()
                # if user.is_suspended:  # ← COMMENT OUT
                #     raise PermissionDenied("Account is suspended.")  # ← COMMENT OUT
                return user
        
        return None

    def get_user(self, user_id):
        try:
            return UserModel.objects.get(pk=user_id)
        except UserModel.DoesNotExist:
            return None