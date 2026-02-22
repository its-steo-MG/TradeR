# mpesa_simulator/urls.py
from django.urls import path
from .views import ConnectMpesaView, MpesaLoginView, MpesaBalanceView, MpesaTransactionsView,MpesaProfileView,MpesaTransactionDetailView

urlpatterns = [
    path('connect/', ConnectMpesaView.as_view(), name='mpesa_connect'),  # Called from TradeRiser profile
    path('login/', MpesaLoginView.as_view(), name='mpesa_login'),  # For fake M-Pesa frontend login
    path('balance/', MpesaBalanceView.as_view(), name='mpesa_balance'),
    path('transactions/', MpesaTransactionsView.as_view(), name='mpesa_transactions'),
    path('transactions/<int:pk>/', MpesaTransactionDetailView.as_view(), name='mpesa_transaction_detail'),
    path('profile/', MpesaProfileView.as_view(), name='mpesa_profile'),
]
