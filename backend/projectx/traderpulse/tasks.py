# traderpulse/tasks.py (Update your existing one)
from celery import shared_task
from .ai_generator import generate_ai_post
from .utils import calculate_online_count
import random
import time
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

@shared_task
def pulse_heartbeat():
    intensity = {
        "low": (20, 80),
        "medium": (8, 25),
        "high": (3, 10),
        "peak": (1, 5)
    }
    from .ai_generator import get_market_time_intensity
    level = get_market_time_intensity()
    delay = random.randint(*intensity[level])
    
    time.sleep(random.uniform(0.5, 3.0))  # human-like delay
    generate_ai_post()
    
    # Broadcast online count every heartbeat (or separate task)
    online = calculate_online_count()
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "traderpulse_global",
        {
            "type": "online_update",
            "online": online
        }
    )
    
    # Reschedule
    pulse_heartbeat.apply_async(countdown=delay)