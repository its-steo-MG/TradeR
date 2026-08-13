# notifications/utils.py
from pywebpush import webpush, WebPushException
from django.conf import settings
import json
import logging

logger = logging.getLogger(__name__)

FRONTEND_URL = "https://traderiserapp.com"

# Icons
MPESA_ICON = f"{FRONTEND_URL}/images/notification-icon.png"
TRADERISER_ICON = f"{FRONTEND_URL}/images/traderiser-logo-192.png"


def send_web_push(user, title: str, body: str, data: dict = None, icon: str = None):
    from .models import PushSubscription

    subscriptions = PushSubscription.objects.filter(user=user)
    if not subscriptions.exists():
        logger.info(f"No push subscriptions for user {user.username}")
        return

    # Decide icon
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

    for sub in list(subscriptions):
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
            logger.info(f"Push sent to {user.username} | title={title}")
        except WebPushException as e:
            logger.warning(f"Push failed for {user.username}: {e}")
            if e.response is not None and e.response.status_code in (404, 410):
                sub.delete()
        except Exception as e:
            logger.error(f"Unexpected push error: {e}")