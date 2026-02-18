# traderpulse/utils.py
import math
from datetime import datetime, timezone
import random

def calculate_online_count():
    """Sine-wave based on UTC hour + jitter for realism"""
    now = datetime.now(timezone.utc)
    hour = now.hour

    # Base curves (peaks at London (7-11) / NY (13-17))
    if 7 <= hour < 11:  # London
        base = 1200
    elif 13 <= hour < 17:  # NY
        base = 1800
    elif 0 <= hour < 6:  # Night
        base = 80
    else:  # Medium
        base = 400

    # Sine wave modulation (±20%)
    minute = now.minute / 60.0
    sine = math.sin(2 * math.pi * minute) * 0.2
    modulated = int(base * (1 + sine))

    # Random jitter (±5-15%)
    jitter = random.randint(-int(base * 0.15), int(base * 0.15))
    final = max(50, modulated + jitter)  # Min 50

    return final