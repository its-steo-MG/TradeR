# agents/urls.py
from django.urls import path
from .views import (
    AgentListView,
    AgentDepositView,
    AgentDepositVerifyView,
    AgentWithdrawalAdminActionView,      # <-- NEW
    AgentWithdrawalRequestView,
    AgentWithdrawalVerifyView,
)

urlpatterns = [
    path('list/', AgentListView.as_view(), name='agent_list'),
    path('deposit/', AgentDepositView.as_view(), name='agent_deposit'),
    path('deposit/verify/', AgentDepositVerifyView.as_view(), name='agent_deposit_verify'),  # <-- NEW
    path('withdraw/request/', AgentWithdrawalRequestView.as_view(), name='agent_withdraw_request'),
    path('withdraw/verify/', AgentWithdrawalVerifyView.as_view(), name='agent_withdraw_verify'),
    path('withdraw/admin-action/', AgentWithdrawalAdminActionView.as_view(), name='agent_withdraw_admin'),
]