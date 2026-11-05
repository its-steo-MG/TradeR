# notifications/delivery.py
"""
M-Pesa push delivery — same pattern as binance/delivery.py
"""
import json
import logging
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def deliver_mpesa_notification(notification_id: int):
    """
    Deliver one MpesaNotification as a system push.
    Looks in:
      1. notifications.PushSubscription
      2. binance.BinancePushSubscription  (fallback — M-Pesa frontend often registers here)
    """
    from .models import MpesaNotification, PushSubscription

    try:
        notification = MpesaNotification.objects.select_related("user").get(pk=notification_id)
    except MpesaNotification.DoesNotExist:
        return

    if notification.push_sent_at:
        return

    private_key = getattr(settings, "VAPID_PRIVATE_KEY", "") or getattr(settings, "BINANCE_WEB_PUSH_PRIVATE_KEY", "")
    contact = getattr(settings, "VAPID_ADMIN_EMAIL", "") or getattr(settings, "BINANCE_WEB_PUSH_CONTACT", "")

    if not private_key or not contact:
        logger.warning("VAPID keys missing — cannot send M-Pesa push")
        return

    from pywebpush import webpush, WebPushException

    payload = json.dumps({
        "title": notification.title or "MPESA",
        "body": (notification.body or "")[:220],
        "icon": f"{getattr(settings, 'FRONTEND_URL', '')}/mpesa-icon-192.png",
        "badge": f"{getattr(settings, 'FRONTEND_URL', '')}/mpesa-icon-192.png",
        "tag": f"mpesa-{notification.pk}",
        "data": notification.data or {},
        "notificationId": notification.pk,
    })

    sent_any = False
    failed = False

    # 1) Primary: notifications.PushSubscription
    for sub in PushSubscription.objects.filter(user_id=notification.user_id):
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=private_key,
                vapid_claims={"sub": contact},
                timeout=10,
            )
            sent_any = True
        except WebPushException as e:
            status_code = getattr(e.response, "status_code", None) if e.response else None
            if status_code in (404, 410):
                sub.delete()
            else:
                failed = True
                logger.warning("M-Pesa push failed (PushSubscription) for notif %s: %s", notification.pk, e)
        except Exception as e:
            failed = True
            logger.warning("M-Pesa push error (PushSubscription) for notif %s: %s", notification.pk, e)

    # 2) Fallback: BinancePushSubscription (M-Pesa frontend often registers here)
    try:
        from binance.models import BinancePushSubscription
        for sub in BinancePushSubscription.objects.filter(user_id=notification.user_id):
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub.endpoint,
                        "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                    },
                    data=payload,
                    vapid_private_key=private_key,
                    vapid_claims={"sub": contact},
                    timeout=10,
                )
                sent_any = True
            except WebPushException as e:
                status_code = getattr(e.response, "status_code", None) if e.response else None
                if status_code in (404, 410):
                    sub.delete()
                else:
                    failed = True
                    logger.warning("M-Pesa push failed (Binance sub) for notif %s: %s", notification.pk, e)
            except Exception as e:
                failed = True
                logger.warning("M-Pesa push error (Binance sub) for notif %s: %s", notification.pk, e)
    except ImportError:
        pass  # binance app not installed

    if sent_any and not failed:
        MpesaNotification.objects.filter(pk=notification.pk).update(push_sent_at=timezone.now())
        logger.info("M-Pesa push sent → user %s | notif %s", notification.user_id, notification.pk)
    elif sent_any:
        # At least one succeeded
        MpesaNotification.objects.filter(pk=notification.pk).update(push_sent_at=timezone.now())
