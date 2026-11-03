"""Delivery uses the project's existing Django mail backend (including Resend)."""
import json
import logging
from urllib.parse import urlparse
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger(__name__)
PUSH_HOSTS = {
    "fcm.googleapis.com",
    "updates.push.services.mozilla.com",
    "web.push.apple.com",
    "push.services.mozilla.com",
    "wns.windows.com",
    "notify.windows.com",
}


def valid_push_endpoint(endpoint):
    try:
        url = urlparse(endpoint)
        return (
            url.scheme == "https"
            and not url.username
            and not url.password
            and url.port in (None, 443)
            and any(
                url.hostname == host
                or (
                    host in {"web.push.apple.com", "wns.windows.com", "notify.windows.com"}
                    and (url.hostname or "").endswith("." + host)
                )
                for host in PUSH_HOSTS
            )
        )
    except (ValueError, TypeError):
        return False


def deliver_notification(notification_id):
    from .models import BinanceNotification, BinancePushSubscription

    notification = BinanceNotification.objects.select_related("user").get(pk=notification_id)
    data = notification.data or {}
    kind = data.get("type", "")

    # Only skip sell/buy if explicitly not completed
    if kind in {"sell", "buy"} and data.get("status") != "completed":
        return

    site_name = getattr(settings, "BINANCE_NOTIFICATION_SITE_NAME", "Binance")

    # ---------- Email ----------
    if notification.user.email and not notification.email_sent_at:
        sender = getattr(settings, "DEFAULT_FROM_EMAIL", None)
        if sender:
            try:
                if kind in {"sell", "buy"} and data.get("reference"):
                    # Special Binance-style trade success template
                    from datetime import datetime, timezone as dt_tz
                    from .trade_emails import trade_context, trade_subject

                    when = (
                        datetime.strptime(data["when_utc"], "%Y-%m-%d %H:%M:%S").replace(tzinfo=dt_tz.utc)
                        if data.get("when_utc")
                        else notification.created_at
                    )
                    ctx = trade_context(
                        notification.user,
                        kind,
                        crypto_amount=data.get("crypto_amount", "0"),
                        fiat_amount=data.get("fiat_amount", "0"),
                        rate=data.get("rate", "0"),
                        fee=data.get("fee", "0"),
                        reference=data["reference"],
                        when=when,
                        asset=data.get("asset", "USDT"),
                        fiat=data.get("fiat", "KES"),
                    )
                    html = render_to_string("binance/emails/trade_success.html", ctx)
                    subject = trade_subject(ctx)
                elif kind == "agent_withdrawal_credit":
                    from .trade_emails import trade_context
                    amount = data.get("amount", "0")
                    ctx = trade_context(
                        notification.user,
                        "received",
                        crypto_amount=amount,
                        fiat_amount=amount,
                        rate="1",
                        fee="0",
                        reference=data.get("reference", ""),
                        when=notification.created_at,
                        asset="USDT",
                        fiat="USDT",
                    )
                    ctx["heading"] = "USDT Received"
                    ctx["kind"] = "received"
                    html = render_to_string("binance/emails/trade_success.html", ctx)
                    subject = f"[Binance] USDT Received - {ctx['when_utc'][:19]} (UTC)"
                else:
                    # Normal notification template
                    html = render_to_string(
                        "binance/emails/notification.html",
                        {
                            "title": notification.title,
                            "body": notification.body,
                            "data": data,
                            "site_name": site_name,
                            "name": notification.user.get_full_name(),
                            "created_at": notification.created_at,
                            "year": timezone.now().year,
                            "app_url": getattr(settings, "BINANCE_APP_URL", ""),
                            "support_url": getattr(settings, "BINANCE_SUPPORT_URL", ""),
                            "password_reset_url": getattr(settings, "BINANCE_PASSWORD_RESET_URL", ""),
                            "privacy_url": getattr(settings, "BINANCE_PRIVACY_URL", ""),
                        },
                    )
                    subject = f"[{site_name}] {notification.title}"

                mail = EmailMultiAlternatives(
                    subject=subject,
                    body=notification.body,
                    from_email=sender,
                    to=[notification.user.email],
                )
                mail.attach_alternative(html, "text/html")
                if mail.send(fail_silently=False):
                    BinanceNotification.objects.filter(pk=notification.pk).update(email_sent_at=timezone.now())
            except Exception as exc:
                logger.warning("Notification email delivery failed for record %s: %s", notification.pk, exc)

    # ---------- Push ----------
    private_key = getattr(settings, "BINANCE_WEB_PUSH_PRIVATE_KEY", "")
    contact = getattr(settings, "BINANCE_WEB_PUSH_CONTACT", "")
    if not private_key or not contact or notification.push_sent_at:
        return

    from pywebpush import webpush, WebPushException

    failed = False
    for subscription in BinancePushSubscription.objects.filter(user_id=notification.user_id):
        if not valid_push_endpoint(subscription.endpoint):
            subscription.delete()
            continue
        try:
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
                },
                data=json.dumps(
                    {
                        "title": notification.title,
                        "body": notification.body[:220],
                        "notificationId": notification.pk,
                    }
                ),
                vapid_private_key=private_key,
                vapid_claims={"sub": contact},
                timeout=10,
            )
        except WebPushException as error:
            if error.response is not None and error.response.status_code in (404, 410):
                subscription.delete()
            else:
                failed = True
                logger.warning("Push delivery failed for notification %s", notification.pk)
        except Exception:
            failed = True
            logger.warning("Push delivery failed for notification %s", notification.pk)

    if not failed:
        BinanceNotification.objects.filter(pk=notification.pk).update(push_sent_at=timezone.now())
