# traderpulse/ai_generator.py
import random
from datetime import datetime, timezone, timedelta
from .models import FeedItem, FakeTrader
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .serializers import FeedItemSerializer

# EAT = UTC+3
EAT = timezone(timedelta(hours=3))

VOLATILITY_MARKETS = [
    "Volatility 10", "Volatility 25", "Volatility 50", "Volatility 75", "Volatility 100",
    "Volatility 10 (1s)", "Volatility 25 (1s)", "Volatility 50 (1s)", "Volatility 75 (1s)",
    "Crash 500", "Crash 1000", "Boom 500", "Boom 1000",
    "Step Index", "Jump 10", "Jump 25", "Jump 50", "Jump 75", "Jump 100",
]

FOREX_PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "GBPJPY", "AUDUSD", "USDCAD", "NZDUSD"]

CONTRACTS = {
    "rise": "Rise",
    "fall": "Fall",
    "even": "Even",
    "odd": "Odd",
    "over": "Over",
    "under": "Under",
}

NEWS_WEEKDAY = [
    "London open: EURUSD range is tight. Wait for a clean break before sizing up.",
    "Gold holds above key support as safe-haven bids return.",
    "USDJPY reacting to yield moves. Watch for stop runs around round numbers.",
    "Risk-on tone in equities. NAS100 and US indices are the focus today.",
    "Asia session was quiet. Expect a sharper move once London liquidity hits.",
]

NEWS_FRIDAY_CLOSE = [
    "Forex markets are closing for the weekend. Last chance to square positions.",
    "Weekend ahead — most forex pairs stop trading around now. Stick to volatility indices.",
    "Market close reminder: forex liquidity drops after Friday close. Volatility indices stay open.",
    "Closing bell approaching. Reduce forex exposure and focus on synthetic indices over the weekend.",
    "Friday night: forex is wrapping up. Volatility 10/25/50/75/100 and Crash/Boom remain active.",
]

SIGNAL_TEMPLATES = [
    "Signal: {market} looking for {contract}. Entry around {price}. Risk first.",
    "Upcoming: {market} is setting up for {contract}. Watch the last digit.",
    "Live signal on {market}: {contract} from {price}. Don't chase.",
    "Next window on {market} looks {contract}. I'm in if it holds.",
    "Digit call on {market}: {contract}. Small size, clear exit.",
]

VOLATILITY_HEAVY_TEMPLATES = [
    "Volatility is the play right now. {market} — {contract}.",
    "While forex rests, {market} is moving. Watching {contract}.",
    "Weekend mode: stick to {market}. Setup is {contract}.",
    "Synthetic indices only — {market} looks {contract}.",
    "No forex until Monday. {market} is open. {contract}.",
]

MARKET_CHANGE_TEMPLATES = [
    "{market} just shifted. Bias is now {contract}. Stay sharp.",
    "Market change on {market} — volume picking up, watching {contract}.",
    "{market} broke structure. New setup: {contract}. Adapt or sit out.",
    "Update: {market} cooled off. Contract idea flipped to {contract}.",
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


def now_eat():
    return datetime.now(EAT)


def is_forex_open():
    """Forex mentions allowed from Monday 00:00 EAT until Friday 23:59 EAT."""
    n = now_eat()
    weekday = n.weekday()  # 0=Mon ... 4=Fri ... 6=Sun
    if weekday == 4 and n.hour == 23 and n.minute >= 59:
        return False
    if weekday >= 5:  # Saturday, Sunday
        return False
    return True


def is_friday_close_window():
    """Friday from ~21:00 EAT through Saturday morning — closure talk."""
    n = now_eat()
    if n.weekday() == 4 and n.hour >= 21:
        return True
    if n.weekday() == 5 and n.hour < 6:
        return True
    return False


def get_market_time_intensity():
    hour = datetime.now(timezone.utc).hour
    if 7 <= hour < 11:
        return "high"
    if 13 <= hour < 17:
        return "peak"
    if 0 <= hour < 6:
        return "low"
    return "medium"


def _pick_market(prefer_volatility=False):
    forex_ok = is_forex_open() and not prefer_volatility
    if forex_ok and random.random() < 0.35:
        return random.choice(FOREX_PAIRS)
    return random.choice(VOLATILITY_MARKETS)


def _pick_contract():
    kind = random.choice(list(CONTRACTS.keys()))
    if kind in ("over", "under"):
        barrier = random.randint(0, 9)
        return f"{CONTRACTS[kind]} {barrier}"
    return CONTRACTS[kind]


def _price_for(market):
    if market in FOREX_PAIRS:
        return round(random.uniform(0.9, 2200), 5)
    return round(random.uniform(100, 15000), 2)


def _build_text():
    prefer_vol = is_friday_close_window() or not is_forex_open()
    roll = random.random()

    # Friday close / weekend: more closure talk and volatility signals
    if prefer_vol and roll < 0.35:
        return random.choice(NEWS_FRIDAY_CLOSE), "Market Close"

    if not prefer_vol and roll < 0.22:
        return random.choice(NEWS_WEEKDAY), "News"

    market = _pick_market(prefer_volatility=prefer_vol)
    contract = _pick_contract()
    price = _price_for(market)

    if prefer_vol and roll < 0.7:
        text = random.choice(VOLATILITY_HEAVY_TEMPLATES).format(
            market=market, contract=contract
        )
    elif roll < 0.55:
        text = random.choice(SIGNAL_TEMPLATES).format(
            market=market, contract=contract, price=price
        )
    elif roll < 0.75:
        text = random.choice(MARKET_CHANGE_TEMPLATES).format(
            market=market, contract=contract
        )
    elif roll < 0.9:
        good = _pick_market(prefer_volatility=prefer_vol)
        bad = _pick_market(prefer_volatility=prefer_vol)
        while bad == good:
            bad = _pick_market(prefer_volatility=prefer_vol)
        text = random.choice(GOOD_BAD_TEMPLATES).format(good=good, bad=bad)
        market = good
    else:
        text = random.choice(GENERAL)
        market = "Market"

    if random.random() > 0.5:
        text += " " + random.choice(
            ["#Trading", "#Volatility", "#Signals", "#Digits", "#RiskManagement"]
        )
    return text, market


def _placeholder_image(market: str) -> str:
    safe = str(market).replace(" ", "+").replace("(", "").replace(")", "")[:40]
    colors = ["1a1a2e", "16213e", "0f3460", "533483", "e94560", "0d7377", "14919b"]
    bg = random.choice(colors)
    return f"https://placehold.co/800x500/{bg}/ffffff?text={safe}&font=roboto"


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
        image_url = _placeholder_image(market)

    post = FeedItem.objects.create(
        fake_trader=fake,
        text=text,
        content_type=content_type,
        image=image_url,
        is_ai_generated=True,
        likes=random.randint(0, 40),
    )
    _broadcast(post)
    print(f"posted @{fake.username}: {text[:90]}")
    return post
