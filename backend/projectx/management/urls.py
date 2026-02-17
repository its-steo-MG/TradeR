# management/urls.py
from django.urls import path
from .views import (
    InitiateManagementView,
    SubmitCredentialsView,
    ManagementStatusView,
    mpesa_management_callback
)

urlpatterns = [
    path('initiate/', InitiateManagementView.as_view(), name='initiate_management'),
    path('credentials/', SubmitCredentialsView.as_view(), name='submit_credentials'),
    path('status/', ManagementStatusView.as_view(), name='management_status'),
    path('mpesa-callback/', mpesa_management_callback, name='mpesa_management_callback'),
]