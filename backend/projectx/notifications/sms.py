# notifications/sms.py
import logging
import subprocess
import json
from urllib.parse import urlencode
from django.conf import settings

logger = logging.getLogger(__name__)


def send_sms(phone_number: str, message: str):
    if not phone_number or not message:
        return None

    try:
        # Normalize phone number
        phone = str(phone_number).strip()
        if phone.startswith("0"):
            phone = "+254" + phone[1:]
        elif phone.startswith("254"):
            phone = "+" + phone
        elif not phone.startswith("+"):
            phone = "+254" + phone

        username = getattr(settings, "AFRICASTALKING_USERNAME", "sandbox")
        api_key = getattr(settings, "AFRICASTALKING_API_KEY", "")

        print("Sending to:", phone)
        print("Username:", username)

        # Properly encode the form data
        form_data = urlencode({
            "username": username,
            "to": phone,
            "message": message,
        })

        cmd = [
            "curl",
            "-s",
            "-X", "POST",
            "https://api.africastalking.com/version1/messaging",
            "-H", "Accept: application/json",
            "-H", "Content-Type: application/x-www-form-urlencoded",
            "-H", f"apiKey: {api_key}",
            "-d", form_data,
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )

        print("Status code:", result.returncode)
        print("Response:", result.stdout)

        if result.returncode == 0 and result.stdout:
            try:
                data = json.loads(result.stdout)
                logger.info(f"SMS sent successfully to {phone}")
                return data
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON response: {result.stdout}")
                return None
        else:
            logger.error(f"curl failed: {result.stderr or result.stdout}")
            return None

    except Exception as e:
        logger.error(f"Failed to send SMS to {phone_number}: {e}", exc_info=True)
        return None