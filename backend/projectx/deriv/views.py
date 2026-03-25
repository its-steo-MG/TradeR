import logging
import asyncio
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings

import secrets
import hashlib
import base64

from .deriv_client import deriv_client
from .models import DerivUserAccount

logger = logging.getLogger(__name__)


def get_user_access_token(request):
    try:
        deriv_account = request.user.deriv_account
        if deriv_account.is_token_expired():
            return None, "Deriv token expired. Please reconnect your Deriv account."
        return deriv_account.access_token, None
    except DerivUserAccount.DoesNotExist:
        return None, "No Deriv account linked. Please connect your Deriv account first."


# ====================== OAUTH LOGIN - PUBLIC (NO AUTH NEEDED) ======================

class DerivOAuthLoginView(APIView):
    """This endpoint must be public so users can get the Deriv login URL"""
    permission_classes = [AllowAny]        # ← Changed to AllowAny
    # No authentication_classes needed

    def get(self, request):
        code_verifier = secrets.token_urlsafe(64)
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode("utf-8")).digest()
        ).decode("utf-8").rstrip("=").replace("+", "-").replace("/", "_")

        state = secrets.token_urlsafe(32)

        request.session['deriv_pkce_verifier'] = code_verifier
        request.session['deriv_oauth_state'] = state

        auth_url = (
            f"https://auth.deriv.com/oauth2/auth?"
            f"response_type=code"
            f"&client_id={settings.DERIV_APP_ID}"
            f"&redirect_uri={settings.DERIV_OAUTH_REDIRECT_URI}"
            f"&scope=trade"
            f"&state={state}"
            f"&code_challenge={code_challenge}"
            f"&code_challenge_method=S256"
        )

        return Response({
            "success": True,
            "auth_url": auth_url,
            "message": "Use this URL to login with your Deriv account"
        })


# ====================== OAUTH CALLBACK ======================

class DerivOAuthCallbackView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    async def get(self, request):
        code = request.GET.get("code")
        state = request.GET.get("state")
        stored_state = request.session.get("deriv_oauth_state")

        if not code or state != stored_state:
            return Response({"success": False, "message": "Invalid state or missing code"}, status=400)

        code_verifier = request.session.pop("deriv_pkce_verifier", None)
        if not code_verifier:
            return Response({"success": False, "message": "Session expired. Please try again."}, status=400)

        token_data = await deriv_client.exchange_oauth_code(
            code=code,
            code_verifier=code_verifier,
            redirect_uri=settings.DERIV_OAUTH_REDIRECT_URI
        )

        if "error" in token_data or "access_token" not in token_data:
            logger.error(f"OAuth callback failed: {token_data}")
            return Response({
                "success": False,
                "message": "Failed to get access token from Deriv",
                "details": token_data
            }, status=400)

        expires_in = token_data.get("expires_in", 3600)
        expires_at = timezone.now() + timezone.timedelta(seconds=expires_in)

        DerivUserAccount.objects.update_or_create(
            user=request.user,
            defaults={
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token"),
                "expires_at": expires_at,
            }
        )

        request.session.pop("deriv_oauth_state", None)

        return Response({
            "success": True,
            "message": "Deriv account connected successfully!",
            "expires_at": expires_at.isoformat(),
            "expires_in_seconds": expires_in,
            "access_token": token_data["access_token"]   # Send JWT back to frontend
        })


# ====================== PROTECTED TRADING ENDPOINTS ======================

class DerivProposalView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        token, error = get_user_access_token(request)
        if error:
            return Response({"success": False, "message": error}, status=400)

        contract_data = request.data
        if not contract_data.get("contract_type") or not contract_data.get("symbol"):
            return Response({"error": "contract_type and symbol are required"}, status=400)

        try:
            result = asyncio.run(deriv_client.get_proposal(contract_data, token))
            if "proposal" in result:
                return Response({"success": True, "proposal": result["proposal"]})
            return Response({"success": False, "details": result}, status=400)
        except Exception as e:
            logger.error(f"Proposal error: {e}", exc_info=True)
            return Response({"success": False, "error": str(e)}, status=500)


class DerivBuyView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        token, error = get_user_access_token(request)
        if error:
            return Response({"success": False, "message": error}, status=400)

        contract_data = request.data
        if not all(k in contract_data for k in ["contract_type", "symbol", "amount"]):
            return Response({"error": "contract_type, symbol, and amount are required"}, status=400)

        try:
            result = asyncio.run(deriv_client.buy_contract(contract_data, token))
            if "error" in result:
                return Response({"success": False, "details": result}, status=400)

            return Response({
                "success": True,
                "message": "Trade placed successfully",
                "contract_id": result.get("buy", {}).get("contract_id"),
                "details": result
            })
        except Exception as e:
            logger.error(f"Buy error: {e}", exc_info=True)
            return Response({"success": False, "error": str(e)}, status=500)


class DerivSellView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        token, error = get_user_access_token(request)
        if error:
            return Response({"success": False, "message": error}, status=400)

        contract_data = request.data
        if not contract_data.get("contract_id"):
            return Response({"error": "contract_id is required"}, status=400)

        try:
            result = asyncio.run(deriv_client.sell_contract(contract_data, token))
            if "error" in result:
                return Response({"success": False, "details": result}, status=400)

            return Response({
                "success": True,
                "message": "Contract sold successfully",
                "details": result
            })
        except Exception as e:
            logger.error(f"Sell error: {e}", exc_info=True)
            return Response({"success": False, "error": str(e)}, status=500)


class DerivBalanceView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        token, error = get_user_access_token(request)
        if error:
            return Response({"success": False, "message": error}, status=400)

        try:
            result = asyncio.run(deriv_client.get_balance(token))
            if "balance" in result:
                return Response({"success": True, "balance": result["balance"]})
            return Response({"success": False, "details": result}, status=400)
        except Exception as e:
            logger.error(f"Balance error: {e}", exc_info=True)
            return Response({"success": False, "error": str(e)}, status=500)


class DerivOpenContractView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        token, error = get_user_access_token(request)
        if error:
            return Response({"success": False, "message": error}, status=400)

        contract_id = request.data.get("contract_id")
        subscribe = request.data.get("subscribe", True)

        if not contract_id:
            return Response({"error": "contract_id is required"}, status=400)

        try:
            result = asyncio.run(deriv_client.get_open_contract(
                contract_id=contract_id,
                access_token=token,
                subscribe=subscribe
            ))
            return Response({
                "success": True,
                "contract": result.get("proposal_open_contract")
            })
        except Exception as e:
            logger.error(f"Open contract error: {e}", exc_info=True)
            return Response({"success": False, "error": str(e)}, status=500)