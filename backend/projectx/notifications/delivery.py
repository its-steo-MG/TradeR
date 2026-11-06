# notifications/delivery.py
"""
M-Pesa push delivery — plain-text body for system notifications.
HTML tags are stripped so they do not appear as raw text.
"""
import json
import logging
import re
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def plain_text(html: str) -> str:
    """Remove HTML tags and clean whitespace for push body."""
    if not html:
        return ""
    clean = re.sub(r"<[^>]+>", "", html)
    clean = clean.replace("&nbsp;", " ").replace("&", "&").replace("<", "<").replace(">", ">")
    return re.sub(r"\s+", " ", clean).strip()


def deliver_mpesa_notification(notification_id: int):
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

    # Plain text only for the system push
    body = plain_text(notification.body or "")[:220]

    payload = json.dumps({
        "title": notification.title or "MPESA",
        "body": body,
        "icon": f"{getattr(settings, 'FRONTEND_URL', '')}/mpesa-icon-192.png",
        "badge": f"{getattr(settings, 'FRONTEND_URL', '')}/mpesa-icon-192.png",
        "tag": f"mpesa-{notification.pk}",
        "data": notification.data or {},
        "notificationId": notification.pk,
    })

    sent_any = False
    failed = False

    # Only M-Pesa origin subscriptions
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

    if sent_any and not failed:
        MpesaNotification.objects.filter(pk=notification.pk).update(push_sent_at=timezone.now())
        logger.info("M-Pesa push sent → user %s | notif %s", notification.user_id, notification.pk)
    elif sent_any:
        MpesaNotification.objects.filter(pk=notification.pk).update(push_sent_at=timezone.now())
