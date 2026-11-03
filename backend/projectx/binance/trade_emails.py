"""Sell/Buy success emails, push and in-app messages. Call only after payment is confirmed."""
from decimal import Decimal, ROUND_DOWN
from django.conf import settings
from datetime import timezone as dt_timezone
from django.utils import timezone


def _fmt(value, places=None):
    d = Decimal(str(value))
    if places is not None:
        d = d.quantize(Decimal(1).scaleb(-places), rounding=ROUND_DOWN)
    s = format(d.normalize(), "f")
    return s


def trade_context(user, kind, *, crypto_amount, fiat_amount, rate, fee, reference, when=None, asset="USDT", fiat="KES"):
    when = when or timezone.now()
    site = getattr(settings, "BINANCE_NOTIFICATION_SITE_NAME", "Binance")
    utc = when.astimezone(dt_timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    return {
        "kind": kind,
        "heading": f"{site} {'Sell' if kind == 'sell' else 'Purchase'} Success",
        "site_name": site,
        "site_domain": getattr(settings, "BINANCE_SITE_DOMAIN", site),
        "logo_url": getattr(settings, "BINANCE_EMAIL_LOGO_URL", ""),
        "greeting_name": getattr(settings, "BINANCE_GREETING_NAME", "Binancian"),
        "full_name": user.get_full_name() or user.username,
        "crypto_amount": _fmt(crypto_amount, 8), "fiat_amount": _fmt(fiat_amount, 2),
        "rate": _fmt(rate, 8), "fee": _fmt(fee, 8), "asset": asset, "fiat": fiat,
        "reference": reference, "when_utc": utc, "year": when.year,
        "password_reset_url": getattr(settings, "BINANCE_PASSWORD_RESET_URL", "#"),
        "support_url": getattr(settings, "BINANCE_SUPPORT_URL", "#"),
        "privacy_url": getattr(settings, "BINANCE_PRIVACY_URL", "#"),
        "anti_phishing_url": getattr(settings, "BINANCE_ANTI_PHISHING_URL", ""),
        "social_links": getattr(settings, "BINANCE_SOCIAL_LINKS", []),
        "legal_notice": getattr(settings, "BINANCE_LEGAL_NOTICE", ""),
    }


def trade_subject(ctx):
    return f"[{ctx['heading']}] - {ctx['when_utc'][:19]} (UTC)"


def trade_message(ctx):
    """Short text used for the in-app message and phone notification."""
    if ctx["kind"] == "sell":
        return (f"Your sell order of {ctx['crypto_amount']} {ctx['asset']} has been completed. "
                f"You received {ctx['fiat_amount']} {ctx['fiat']}.")
    return (f"Your purchase of {ctx['crypto_amount']} {ctx['asset']} is successful. "
            f"You paid {ctx['fiat_amount']} {ctx['fiat']}.")


def notify_trade_success(user, kind, **kwargs):
    """Create the completed notification; email + push are dispatched after commit by signals."""
    from .models import BinanceNotification
    ctx = trade_context(user, kind, **kwargs)
    data = {k: ctx[k] for k in ("crypto_amount", "fiat_amount", "rate", "fee", "asset", "fiat", "reference", "when_utc")}
    data.update({"type": kind, "status": "completed"})
    return BinanceNotification.objects.create(user=user, title=ctx["heading"], body=trade_message(ctx), data=data)
