import asyncio
import logging
import threading
from django.apps import AppConfig
from django.conf import settings

logger = logging.getLogger(__name__)


class DerivConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'deriv'
    verbose_name = "Deriv Integration"

    def ready(self):
        """
        Start the Deriv public ticks listener safely using a background thread.
        """
        if settings.DEBUG:
            logger.info("🚀 Deriv app ready (DEBUG mode) - Starting public ticks listener...")
        else:
            logger.info("🚀 Deriv app ready - Starting public ticks listener...")

        # Import here to avoid circular imports
        from .deriv_client import deriv_client

        def start_deriv_listener():
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

                # Start the public ticks listener
                loop.run_until_complete(deriv_client._ensure_public_ws())

                # Keep the loop running
                loop.run_forever()

            except Exception as e:
                logger.error(f"❌ Deriv listener thread crashed: {e}", exc_info=True)

        # Start in daemon thread
        listener_thread = threading.Thread(
            target=start_deriv_listener,
            name="DerivPublicTicksListener",
            daemon=True
        )
        listener_thread.start()

        logger.info("✅ Deriv public ticks listener thread started successfully")