import asyncio
import json
import websockets
import httpx
from django.conf import settings
import logging
from typing import Dict, Optional
from collections import defaultdict
from channels.layers import get_channel_layer
import secrets
import hashlib
import base64
from django.utils import timezone

logger = logging.getLogger(__name__)


class DerivClient:
    def __init__(self):
        self.app_id = settings.DERIV_APP_ID
        self.markup = getattr(settings, 'DERIV_MARKUP_PERCENT', 2.0) / 100.0

        # Public WebSocket for market ticks (no auth)
        self.public_ws: Optional[websockets.WebSocketClientProtocol] = None
        self._listener_task: Optional[asyncio.Task] = None
        self._sub_count = defaultdict(int)   # symbol -> client count

        self.channel_layer = get_channel_layer()
        self._http_client = httpx.AsyncClient(timeout=15.0)

    # ====================== PUBLIC TICKS ======================

    async def _ensure_public_ws(self):
        if self.public_ws and not self.public_ws.closed:
            return

        try:
            url = "wss://api.derivws.com/trading/v1/options/ws/public"
            self.public_ws = await websockets.connect(
                url, ping_interval=20, ping_timeout=30
            )
            logger.info("✅ Connected to Deriv Public WebSocket (ticks)")

            if not self._listener_task or self._listener_task.done():
                self._listener_task = asyncio.create_task(self._public_ticks_listener())
        except Exception as e:
            logger.error(f"Public WS connection failed: {e}")
            raise

    async def _public_ticks_listener(self):
        logger.info("🚀 Deriv Public Ticks Listener Started")
        while True:
            try:
                message = await self.public_ws.recv()
                data = json.loads(message)

                # More robust check (Deriv often uses msg_type)
                if data.get("msg_type") == "tick" or "tick" in data:
                    tick_data = data.get("tick")
                    symbol = tick_data.get("symbol") if tick_data else None
                    if symbol:
                        await self.channel_layer.group_send(
                            f"ticks_{symbol}",
                            {
                                "type": "tick_message",
                                "symbol": symbol,
                                "tick": tick_data
                            }
                        )
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Public ticks listener error: {e}")
                await asyncio.sleep(2)
                await self._ensure_public_ws()  # reconnect

    async def subscribe_ticks(self, symbol: str):
        await self._ensure_public_ws()
        self._sub_count[symbol] += 1

        req = {"ticks": symbol, "subscribe": 1}
        try:
            await self.public_ws.send(json.dumps(req))
            logger.info(f"Subscribed to public ticks: {symbol}")
        except Exception as e:
            logger.error(f"Subscribe failed for {symbol}: {e}")
            self._sub_count[symbol] -= 1  # rollback on failure

    async def unsubscribe_ticks(self, symbol: str):
        if symbol in self._sub_count:
            self._sub_count[symbol] -= 1
            if self._sub_count[symbol] <= 0:
                try:
                    await self.public_ws.send(json.dumps({"forget_all": "ticks"}))
                except Exception:
                    pass
                del self._sub_count[symbol]

    # ====================== OAUTH 2.0 LOGIN ======================

    async def exchange_oauth_code(self, code: str, code_verifier: str, redirect_uri: str) -> Dict:
        """Exchange authorization code for access token (PKCE)"""
        payload = {
            "grant_type": "authorization_code",
            "client_id": self.app_id,
            "code": code,
            "code_verifier": code_verifier,
            "redirect_uri": redirect_uri,
        }
        try:
            resp = await self._http_client.post(
                "https://auth.deriv.com/oauth2/token",
                data=payload,  # form-encoded
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            resp.raise_for_status()
            data = resp.json()
            logger.info("✅ Deriv OAuth token exchange successful")
            return data
        except Exception as e:
            logger.error(f"OAuth token exchange failed: {e}")
            return {"error": str(e)}

    # ====================== AUTHENTICATED TRADING (REST + Bearer) ======================

    async def _make_authenticated_request(self, endpoint: str, payload: Dict, access_token: str) -> Dict:
        """Generic helper for authenticated REST calls"""
        headers = {
            "Deriv-App-ID": self.app_id,
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        url = f"https://api.derivws.com/trading/v1/options{endpoint}"
        try:
            resp = await self._http_client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Deriv API error {e.response.status_code}: {e.response.text}")
            return {"error": e.response.text}
        except Exception as e:
            logger.error(f"Request failed: {e}")
            return {"error": str(e)}

    async def get_proposal(self, contract_params: Dict, access_token: str) -> Dict:
        """Fully flexible proposal — supports ALL Deriv contract types"""
        payload = {
            "proposal": 1,
            **contract_params,                     # Pass everything from frontend (amount, barrier, etc.)
        }

        # Ensure correct symbol field name
        if "symbol" in payload and "underlying_symbol" not in payload:
            payload["underlying_symbol"] = payload.pop("symbol")

        return await self._make_authenticated_request("", payload, access_token)

    async def buy_contract(self, contract_params: Dict, access_token: str) -> Dict:
        """Buy contract with optional markup"""
        original_amount = float(contract_params.get("amount", 10))
        marked_amount = round(original_amount * (1 + self.markup), 2)

        # Get proposal with marked-up amount
        proposal_resp = await self.get_proposal(
            {**contract_params, "amount": marked_amount}, 
            access_token
        )

        if "proposal" not in proposal_resp or "id" not in proposal_resp.get("proposal", {}):
            return {"error": "Failed to get proposal", "details": proposal_resp}

        proposal_id = proposal_resp["proposal"]["id"]

        buy_payload = {"buy": proposal_id, "price": marked_amount}
        return await self._make_authenticated_request("", buy_payload, access_token)

    async def sell_contract(self, contract_params: Dict, access_token: str) -> Dict:
        """Sell (close) an open contract — price=0 means market sell"""
        payload = {
            "sell": contract_params.get("contract_id"),
            "price": float(contract_params.get("price", 0)),   # 0 = sell at market
        }
        return await self._make_authenticated_request("", payload, access_token)

    async def get_balance(self, access_token: str) -> Dict:
        payload = {"balance": 1}
        return await self._make_authenticated_request("", payload, access_token)

    async def get_open_contract(self, contract_id: str, access_token: str, subscribe: bool = True) -> Dict:
        """Get open contract details (supports subscription for updates)"""
        payload = {
            "proposal_open_contract": 1,
            "contract_id": contract_id,
            "subscribe": 1 if subscribe else 0,
        }
        return await self._make_authenticated_request("", payload, access_token)

    # ====================== CLEANUP ======================

    async def close(self):
        if self._listener_task and not self._listener_task.done():
            self._listener_task.cancel()
        if self.public_ws:
            await self.public_ws.close()
        await self._http_client.aclose()
        logger.info("Deriv Client closed")


# Global singleton (mainly for public ticks)
deriv_client = DerivClient()