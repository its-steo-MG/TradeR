# traderpulse/ai_generator.py
import os
import random
from datetime import datetime, timezone
from .models import FeedItem, FakeTrader
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .serializers import FeedItemSerializer

FOREX_PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "GBPJPY", "AUDUSD", "USDCAD", "NZDUSD"]
VOLATILITY_MARKETS = [
    "Volatility 10", "Volatility 25", "Volatility 50", "Volatility 75", "Volatility 100",
    "Volatility 10 (1s)", "Volatility 25 (1s)", "Volatility 50 (1s)", "Volatility 75 (1s)",
    "Crash 500", "Crash 1000", "Boom 500", "Boom 1000",
    "Step Index", "Jump 10", "Jump 25", "Jump 50", "Jump 75", "Jump 100",
]

NEWS = [
    "Breaking: Fed speakers hint at holding rates. Dollar may stay firm into the NY open.",
    "Gold holds above key support as safe-haven bids return.",
    "London open: EURUSD range is tight. Wait for a clean break before sizing up.",
    "Oil softens after inventory data. Risk pairs may follow.",
    "Asia session was quiet. Expect a sharper move once London liquidity hits.",
    "NFP week reminder: volatility spikes around the release. Reduce size.",
    "Risk-on tone in equities. NAS100 and US indices are the focus today.",
    "USDJPY reacting to yield moves. Watch for stop runs around round numbers.",
    "Crypto mixed. BTC holding a range while alts lag.",
    "Session tip: best flow is usually London open and the NY overlap.",
    "Volatility indices are cleaner than forex right now. Stick to what is moving.",
    "News alert: unexpected data print. Spread may widen for a few minutes — stand aside.",
    "Weekend gap risk is real on some pairs. Don't hold oversized into the close.",
    "Trader note: the best trade today may be no trade.",
]

SIGNAL_TEMPLATES = [
    "Signal: {market} looking {bias}. Entry around {price}, TP {target}. Risk first.",
    "Upcoming: {market} is setting up for a {bias} move. Watch {price}.",
    "Live signal on {market}: {bias} from {price}. Don't chase.",
    "Next window on {market} looks {bias}. I'm in if it holds {price}.",
]

MARKET_CHANGE_TEMPLATES = [
    "{market} just shifted. Momentum is now {bias}. Stay sharp.",
    "Market change on {market} — volume picking up, bias {bias}.",
    "{market} broke structure. New bias: {bias}. Adapt or sit out.",
    "Update: {market} cooled off. Bias flipped to {bias}.",
]

GOOD_BAD_TEMPLATES = [
    "Good market right now: {good}. Bad / avoid: {bad}. Stick to the clean one.",
    "Today's pick — trade {good}, skip {bad}.",
    "{good} is behaving. {bad} is chopping. Protect the account.",
    "Green light on {good}. Red light on {bad}. Simple.",
]

GENERAL = [
    "Discipline over greed. Wait for the setup.",
    "Risk management saved me today.",
    "If the market is unclear, do nothing. That's a trade.",
    "Took a small L — process over profit.",
    "Stop hunting again… classic. Don't revenge trade.",
]


def get_market_time_intensity():
    hour = datetime.now(timezone.utc).hour
    if 7 <= hour < 11:
        return "high"
    if 13 <= hour < 17:
        return "peak"
    if 0 <= hour < 6:
        return "low"
    return "medium"


def _pick_market():
    if random.random() < 0.5:
        return random.choice(FOREX_PAIRS), "forex"
    return random.choice(VOLATILITY_MARKETS), "volatility"


def _price_for(kind):
    if kind == "forex":
        return round(random.uniform(0.9, 2200), 5)
    return round(random.uniform(100, 15000), 2)


def _build_text():
    roll = random.random()
    if roll < 0.3:
        return random.choice(NEWS), "News"

    market, kind = _pick_market()
    bias = random.choice(["bullish", "bearish", "ranging", "breakout", "reversal"])
    price = _price_for(kind)
    target = round(price + random.uniform(-80, 120), 2 if kind == "volatility" else 5)

    if roll < 0.55:
        text = random.choice(SIGNAL_TEMPLATES).format(market=market, bias=bias, price=price, target=target)
    elif roll < 0.75:
        text = random.choice(MARKET_CHANGE_TEMPLATES).format(market=market, bias=bias)
    elif roll < 0.9:
        good, _ = _pick_market()
        bad, _ = _pick_market()
        while bad == good:
            bad, _ = _pick_market()
        text = random.choice(GOOD_BAD_TEMPLATES).format(good=good, bad=bad)
        market = good
    else:
        text = random.choice(GENERAL)
        market = "Market"

    if random.random() > 0.5:
        text += " " + random.choice(["#Trading", "#Forex", "#Volatility", "#Signals", "#News", "#RiskManagement"])
    return text, market


def _broadcast(post):
    try:
        data = FeedItemSerializer(post).data
        layer = get_channel_layer()
        if layer:
            async_to_sync(layer.group_send)(
                "traderpulse_global",
                {"type": "new_post", "post": data},
            )
    except Exception as e:
        print("broadcast failed:", e)


def generate_ai_post():
    fake = FakeTrader.objects.order_by("?").first()
    if not fake:
        print("No fake traders. Run: python manage.py seed_fake_traders")
        return None

    text, market = _build_text()
    content_type = random.choices(["text", "chart", "win"], weights=[70, 20, 10], k=1)[0]
    image_url = None
    if content_type != "text":
        image_url = f"https://fakeimg.com/800x600?text={str(market).replace(' ', '+')}"

    post = FeedItem.objects.create(
        fake_trader=fake,
        text=text,
        content_type=content_type,
        image=image_url,
        is_ai_generated=True,
        likes=random.randint(0, 40),
    )
    _broadcast(post)
    print(f"posted @{fake.username}: {text[:80]}")
    return post
