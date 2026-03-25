import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from .deriv_client import deriv_client

logger = logging.getLogger(__name__)


class DerivTicksConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        await self.accept()
        self.symbol = None
        logger.info(f"✅ Client {self.channel_name} connected")

    async def disconnect(self, close_code):
        if self.symbol:
            await self.unsubscribe(self.symbol)
        logger.info(f"Client {self.channel_name} disconnected")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get("action")
            symbol = data.get("symbol")

            if action == "subscribe" and symbol:
                self.symbol = symbol
                await self.subscribe(symbol)
                await self.send(json.dumps({"status": "subscribed", "symbol": symbol}))

            elif action == "unsubscribe" and self.symbol:
                await self.unsubscribe(self.symbol)
                await self.send(json.dumps({"status": "unsubscribed", "symbol": self.symbol}))

        except Exception as e:
            logger.error(f"Message error: {e}")
            await self.send(json.dumps({"error": "Invalid format"}))

    async def subscribe(self, symbol: str):
        await deriv_client.subscribe_ticks(symbol)
        await self.channel_layer.group_add(f"ticks_{symbol}", self.channel_name)

    async def unsubscribe(self, symbol: str):
        await self.channel_layer.group_discard(f"ticks_{symbol}", self.channel_name)
        await deriv_client.unsubscribe_ticks(symbol)

    async def tick_message(self, event):
        await self.send(json.dumps({
            "type": "tick",
            "symbol": event["symbol"],
            "tick": event["tick"]
        }))