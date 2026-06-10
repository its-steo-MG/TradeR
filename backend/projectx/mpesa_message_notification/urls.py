from django.urls import path
from .views import MpesaNotificationsView, MarkNotificationReadView,ConnectMessagesView,MpesaMessagesLoginView

urlpatterns = [
    path('notifications/', MpesaNotificationsView.as_view(), name='mpesa_notifications'),
    path('notifications/<int:pk>/read/', MarkNotificationReadView.as_view(), name='mark_notification_read'),
    path('connect/', ConnectMessagesView.as_view(), name='connect_messages'),
    path('login/', MpesaMessagesLoginView.as_view(), name='messages_login'),
]