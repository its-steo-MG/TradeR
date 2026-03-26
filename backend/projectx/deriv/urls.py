# urls.py
from django.urls import path
from .views import (
    DerivBuyView, DerivProposalView, DerivBalanceView,
    DerivOpenContractView, DerivSellView,
    DerivOAuthLoginView,
    deriv_oauth_callback,          # ← Import the function, not the class
)

urlpatterns = [
    path('buy/', DerivBuyView.as_view(), name='deriv-buy'),
    path('proposal/', DerivProposalView.as_view(), name='deriv-proposal'),
    path('balance/', DerivBalanceView.as_view(), name='deriv-balance'),
    path('open-contract/', DerivOpenContractView.as_view(), name='deriv-open-contract'),
    path('sell/', DerivSellView.as_view(), name='deriv-sell'),

    # OAuth
    path('oauth/login/', DerivOAuthLoginView.as_view(), name='deriv-oauth-login'),
    path('oauth/callback/', deriv_oauth_callback, name='deriv-oauth-callback'),   # ← No .as_view()
]