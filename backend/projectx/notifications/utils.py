# notifications/utils.py
from pywebpush import webpush, WebPushException
from django.conf import settings
import json
import logging

logger = logging.getLogger(__name__)

FRONTEND_URL = getattr(settings, "FRONTEND_URL", "http://localhost:3000")

# Icons
MPESA_ICON = f"{FRONTEND_URL}/images/notification-icon.png"
TRADERISER_ICON = f"{FRONTEND_URL}/images/traderiser-logo-192.png"


def send_web_push(user, title: str, body: str, data: dict = None, icon: str = None):
    """
    Send web push to all subscriptions of a single user.
    Automatically deletes expired/unsubscribed (404/410) subscriptions.
    Returns number of successful deliveries.
    """
    from .models import PushSubscription

    subscriptions = list(PushSubscription.objects.filter(user=user))
    if not subscriptions:
        return 0

    if icon:
        final_icon = icon
    elif title.upper() == "MPESA":
        final_icon = MPESA_ICON
    else:
        final_icon = TRADERISER_ICON

    payload = {
        "title": title,
        "body": body,
        "icon": final_icon,
        "badge": final_icon,
        "image": final_icon,
        "data": data or {},
    }

    sent_count = 0
    deleted_count = 0

    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {
                        "p256dh": sub.p256dh,
                        "auth": sub.auth,
                    },
                },
                data=json.dumps(payload),
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": settings.VAPID_ADMIN_EMAIL},
            )
            sent_count += 1
            logger.info(f"Push sent → {user.username} | {title}")
        except WebPushException as e:
            status_code = getattr(e.response, "status_code", None) if e.response else None
            msg = str(e).lower()

            if status_code in (404, 410) or "410" in msg or "unsubscribed" in msg or "expired" in msg:
                sub.delete()
                deleted_count += 1
            else:
                logger.warning(f"Push failed for {user.username}: {e}")
        except Exception as e:
            logger.error(f"Unexpected push error for {user.username}: {e}")

    if deleted_count:
        logger.info(f"Cleaned {deleted_count} expired subscription(s) for {user.username}")

    return sent_count


def send_web_push_to_users(users=None, title: str = "", body: str = "", data: dict = None, icon: str = None):
    """
    Broadcast push to many users.
    users=None → all users who have at least one push subscription.
    """
    from .models import PushSubscription
    from django.contrib.auth import get_user_model
    User = get_user_model()

    if users is None:
        user_ids = PushSubscription.objects.values_list("user_id", flat=True).distinct()
        users = User.objects.filter(id__in=user_ids, is_active=True)
    elif hasattr(users, "filter"):
        users = users.filter(is_active=True)

    total_sent = 0
    for user in users:
        total_sent += send_web_push(user, title, body, data=data, icon=icon)
    return total_sent
