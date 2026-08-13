# notifications/utils.py
from pywebpush import webpush, WebPushException
from django.conf import settings
import json
import logging

logger = logging.getLogger(__name__)

# Your frontend domain
FRONTEND_URL = "https://traderiserapp.com"

def send_web_push(user, title: str, body: str, data: dict = None, icon: str = None):
    from .models import PushSubscription

    subscriptions = PushSubscription.objects.filter(user=user)
    if not subscriptions.exists():
        logger.info(f"No push subscriptions for user {user.username}")
        return

    # Always use full absolute URL for the icon
    default_icon = f"{FRONTEND_URL}/images/notification-icon.png"

    payload = {
        "title": title,
        "body": body,
        "icon": icon or default_icon,
        "badge": default_icon,
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
            logger.info(f"Push sent to {user.username}")
        except WebPushException as e:
            logger.warning(f"Push failed for {user.username}: {e}")
            if e.response is not None and e.response.status_code in (404, 410):
                sub.delete()
                logger.info(f"Deleted expired subscription for {user.username}")
        except Exception as e:
            logger.error(f"Unexpected push error: {e}")