from django.apps import AppConfig

class MpesaMessageNotificationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'mpesa_message_notification'
    verbose_name = "M-Pesa Message Notifications"

    def ready(self):
        import mpesa_message_notification.signals