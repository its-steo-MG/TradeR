from django.urls import path
from .views import (
    EquityHomeView,
    EquityAccountsView,
    EquityTransactionsView,
    EquityNotificationsView,
    MarkNotificationReadView,
    AdminAdjustBalanceView,
)

urlpatterns = [
    path('home/', EquityHomeView.as_view(), name='equity_home'),
    path('accounts/', EquityAccountsView.as_view(), name='equity_accounts'),
    path('transactions/', EquityTransactionsView.as_view(), name='equity_transactions'),
    path('notifications/', EquityNotificationsView.as_view(), name='equity_notifications'),
    path('notifications/<int:pk>/read/', MarkNotificationReadView.as_view(), name='equity_notif_read'),
    path('admin/adjust-balance/', AdminAdjustBalanceView.as_view(), name='equity_admin_adjust'),
]