# mpesa_simulator/urls.py
from django.urls import path
from .views import (
    ConnectMpesaView, 
    MpesaLoginView, 
    MpesaBalanceView, 
    MpesaTransactionsView,
    MpesaProfileView,
    MpesaTransactionDetailView,
    SendMoneyView,
    RecipientLookupView   # ← NEW
)

urlpatterns = [
    path('connect/', ConnectMpesaView.as_view(), name='mpesa_connect'),
    path('login/', MpesaLoginView.as_view(), name='mpesa_login'),
    path('balance/', MpesaBalanceView.as_view(), name='mpesa_balance'),
    path('transactions/', MpesaTransactionsView.as_view(), name='mpesa_transactions'),
    path('transactions/<int:pk>/', MpesaTransactionDetailView.as_view(), name='mpesa_transaction_detail'),
    path('profile/', MpesaProfileView.as_view(), name='mpesa_profile'),
    
    # Send Money Features
    path('send-money/', SendMoneyView.as_view(), name='mpesa_send_money'),
    path('lookup-recipient/', RecipientLookupView.as_view(), name='mpesa_lookup_recipient'),
]