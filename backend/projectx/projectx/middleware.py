import time
from django.db import OperationalError

class DatabaseRetryMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        max_retries = 5
        for attempt in range(max_retries):
            try:
                return self.get_response(request)
            except OperationalError as e:
                if "database is locked" in str(e).lower() and attempt < max_retries - 1:
                    time.sleep(0.3 * (attempt + 1))  # Exponential backoff
                    continue
                raise