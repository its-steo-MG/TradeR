from django.urls import path
from .push_views import PushSubscriptionView
from .views import (
    BinanceHomeView,
    BinanceWalletsView,
    BinanceTransactionsView,
    BinanceNotificationsView,
    MarkBinanceNotificationReadView,
    AdminAdjustBinanceBalanceView,
    BinanceSellView,
    BinanceBuyView,
)

urlpatterns = [
    path("push/subscription/", PushSubscriptionView.as_view(), name="binance_push_subscription"),
    path('home/', BinanceHomeView.as_view(), name='binance_home'),
    path('wallets/', BinanceWalletsView.as_view(), name='binance_wallets'),
    path('transactions/', BinanceTransactionsView.as_view(), name='binance_transactions'),
    path('notifications/', BinanceNotificationsView.as_view(), name='binance_notifications'),
    path('notifications/<int:pk>/read/', MarkBinanceNotificationReadView.as_view(), name='binance_notif_read'),
    path('admin/adjust-balance/', AdminAdjustBinanceBalanceView.as_view(), name='binance_admin_adjust'),
    path('sell/', BinanceSellView.as_view(), name='binance_sell'),
    path('buy/', BinanceBuyView.as_view(), name='binance_buy'),
]
