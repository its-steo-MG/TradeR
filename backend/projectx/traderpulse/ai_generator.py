# traderpulse/ai_generator.py
import os
import requests
import random
from datetime import datetime, timezone
from .models import FeedItem, FakeTrader
from django.conf import settings

# Use Grok-4 via xAI API (or fallback to Claude/GPT-4o)
GROK_API_KEY = os.getenv("XAI_API_KEY")  # Set in .env
FLUX_API_KEY = os.getenv("REPLICATE_API_TOKEN")  # Flux via Replicate

MARKET_PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "NAS100", "BTCUSD", "ETHUSD", "SPX500"]

TEMPLATES = [
    "Just closed {pair} at {price} — {pnl} pips in the bag!",
    "Who’s still holding {pair}? This level is CRUCIAL.",
    "London session delivering as always",
    "Took a small L on {pair} — discipline over greed.",
    "Chart looking clean on {pair} — target {target}",
    "Anyone seeing this reversal on Gold?",
    "Risk management saved me today",
    "From $100 to $12k in 11 months. Possible? Yes.",
    "Stop hunting again… classic",
]

def get_market_time_intensity():
    hour = datetime.now(timezone.utc).hour
    if 7 <= hour < 11:
        return "high"    # London
    elif 13 <= hour < 17:
        return "peak"    # NY
    elif 0 <= hour < 6:
        return "low"
    else:
        return "medium"

def generate_ai_post():
    intensity = get_market_time_intensity()
    fake = FakeTrader.objects.order_by("?").first()
    
    template = random.choice(TEMPLATES)
    pair = random.choice(MARKET_PAIRS)
    price = round(random.uniform(0.9, 2200), 5 if "USD" in pair else 2)
    pnl = random.randint(15, 420)
    target = price + random.uniform(50, 500) if random.random() > 0.5 else price - random.uniform(50, 500)

    text = template.format(pair=pair, price=price, pnl=pnl, target=target)
    if random.random() > 0.6:
        text += " " + random.choice(["#Trading", "#Forex", "#DayTrading", "#Profit", "#Discipline"])

    content_type = random.choices(
        ["text", "image", "chart", "win"],
        weights=[40, 30, 20, 10], k=1
    )[0]

    image_url = None
    if content_type in ["image", "chart", "win"]:
        image_url = generate_chart_image(text, pair)

    FeedItem.objects.create(
        fake_trader=fake,
        text=text,
        content_type=content_type,
        image=image_url,
        is_ai_generated=True,
        likes=random.randint(0, 87)
    )

def generate_chart_image(caption, pair):
    # Using Flux + Ideogram-style prompt
    prompt = f"A professional trading chart of {pair} with clean candlesticks, trendlines, support/resistance, volume, RSI, MACD. Overlay text: '{caption}'. Dark theme, TradingView style, ultra realistic screenshot"
    
    # Placeholder — replace with real Flux call later
    return f"https://fakeimg.com/800x600?text={pair}+Chart+AI"