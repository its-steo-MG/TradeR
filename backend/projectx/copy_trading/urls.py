# copy_trading/urls.py
from django.urls import path
from .views import TraderListView, BecomeTraderView, CopySubscriptionView, UserSubscriptionsView

urlpatterns = [
    path('traders/', TraderListView.as_view(), name='trader_list'),
    path('become-trader/', BecomeTraderView.as_view(), name='become_trader'),
    path('subscriptions/', UserSubscriptionsView.as_view(), name='user_subscriptions'),
    path('subscriptions/create/', CopySubscriptionView.as_view(), name='create_subscription'),  # POST for create/update
    path('subscriptions/<int:subscription_id>/pause/', CopySubscriptionView.as_view(), name='pause_subscription'),  # DELETE to pause
]