# urls.py
from django.urls import path
from .views import ResendOTPView, SignupView, LoginView, SashiToggleView, AccountDetailView, ResetDemoBalanceView, CreateAdditionalAccountView, SwitchWalletView, VerifyEmailView, password_reset_request, password_reset_verify, password_reset_confirm,AppealSuspensionView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('sashi/toggle/', SashiToggleView.as_view(), name='sashi_toggle'),
    path('account/', AccountDetailView.as_view(), name='account_detail'),
    path('demo/reset/', ResetDemoBalanceView.as_view(), name='reset_demo_balance'),
    path('account/create/', CreateAdditionalAccountView.as_view(), name='create_additional_account'),
    path('wallet/switch/', SwitchWalletView.as_view(), name='switch_wallet'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('resend-otp/', ResendOTPView.as_view(), name='resend_otp'),
    path('password-reset/', password_reset_request),
    path('password-reset/verify/', password_reset_verify),
    path('password-reset/confirm/', password_reset_confirm),
    path('appeal-suspension/', AppealSuspensionView.as_view(), name='appeal_suspension'),
]