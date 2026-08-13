# notifications/urls.py
from django.urls import path
from .views import SavePushSubscriptionView

urlpatterns = [
    path('subscribe/', SavePushSubscriptionView.as_view(), name='push_subscribe'),
]