# notifications/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction


@receiver(post_save, sender="notifications.MpesaNotification")
def dispatch_mpesa_notification(sender, instance, created, **kwargs):
    """
    Same pattern as Binance:
    Create MpesaNotification → after commit → deliver push.
    """
    if not created:
        return
    from .delivery import deliver_mpesa_notification
    transaction.on_commit(
        lambda pk=instance.pk: deliver_mpesa_notification(pk),
        robust=True,
    )
