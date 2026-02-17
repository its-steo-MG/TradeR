from django.urls import path
from .views import DashboardView, ResetDemoView

urlpatterns = [
    path('', DashboardView.as_view(), name='dashboard'),
    path('reset-demo/', ResetDemoView.as_view(), name='reset_demo'),
]