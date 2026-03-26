import logging
import asyncio
from django.utils import timezone
from django.shortcuts import redirect
from django.views.decorators.csrf import csrf_exempt

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication

from django.conf import settings

import secrets
import hashlib
import base64
import urllib.parse

from .deriv_client import deriv_client
from .models import DerivUserAccount

logger = logging.getLogger(__name__)


async def get_user_access_token(request):
    """Async-safe helper to get user's Deriv access token"""
    try:
        deriv_account = request.user.deriv_account
        if deriv_account.is_token_expired():
            return None, "Deriv token expired. Please reconnect your Deriv account."
        return deriv_account.access_token, None
    except DerivUserAccount.DoesNotExist:
        return None, "No Deriv account linked. Please connect your Deriv account first."
    except AttributeError:
        return None, "User not properly authenticated."
    except Exception as e:
        logger.error(f"Error fetching Deriv account: {e}")
        return None, "Internal error fetching account."


# ====================== OAUTH LOGIN (Public + Multi-Frontend Support) ======================

class DerivOAuthLoginView(APIView):
    """Public endpoint — returns Deriv login / create account URL"""
    permission_classes = [AllowAny]

    def get(self, request):
        prompt = request.query_params.get("prompt", "consent")

        # Get frontend origin from query param (sent by Next.js)
        frontend_url = request.query_params.get('frontend_url') or settings.FRONTEND_URL

        # Security: Only allow whitelisted frontends
        if frontend_url not in getattr(settings, 'ALLOWED_DERIV_FRONTENDS', {settings.FRONTEND_URL}):
            logger.warning(f"Unauthorized frontend attempted Deriv login: {frontend_url}")
            frontend_url = settings.FRONTEND_URL  # safe fallback

        code_verifier = secrets.token_urlsafe(64)
        code_challenge = (
            base64.urlsafe_b64encode(
                hashlib.sha256(code_verifier.encode("utf-8")).digest()
            )
            .decode("utf-8")
            .rstrip("=")
            .replace("+", "-")
            .replace("/", "_")
        )

        state = secrets.token_urlsafe(32)

        # Store in session for callback validation
        request.session['deriv_pkce_verifier'] = code_verifier
        request.session['deriv_oauth_state'] = state
        request.session['deriv_frontend_origin'] = frontend_url   # ← Key for multi-frontend

        auth_url = (
            f"https://auth.deriv.com/oauth2/auth?"
            f"response_type=code"
            f"&client_id={settings.DERIV_APP_ID}"
            f"&redirect_uri={settings.DERIV_OAUTH_REDIRECT_URI}"
            f"&scope=trade"
            f"&state={state}"
            f"&code_challenge={code_challenge}"
            f"&code_challenge_method=S256"
            f"&prompt={prompt}"
        )

        return Response({
            "success": True,
            "auth_url": auth_url,
            "message": "Redirect the user to this URL to connect with Deriv"
        })


# ====================== OAUTH CALLBACK (Multi-Frontend Support) ======================

@csrf_exempt
async def deriv_oauth_callback(request):
    """Handles redirect from Deriv and forwards user to the correct frontend"""
    code = request.GET.get("code")
    state = request.GET.get("state")
    error = request.GET.get("error")

    if error:
        logger.error(f"Deriv returned OAuth error: {error}")
        error_msg = urllib.parse.quote(f"Deriv error: {error}")
        return redirect(f"{settings.FRONTEND_URL}/deriv-callback?success=false&message={error_msg}")

    stored_state = request.session.get("deriv_oauth_state")
    if not code or state != stored_state:
        logger.warning("OAuth state mismatch or missing code")
        return redirect(f"{settings.FRONTEND_URL}/deriv-callback?success=false&message=Invalid+state+or+missing+code")

    code_verifier = request.session.pop("deriv_pkce_verifier", None)
    if not code_verifier:
        logger.warning("Missing code_verifier in session")
        return redirect(f"{settings.FRONTEND_URL}/deriv-callback?success=false&message=Session+expired")

    # Exchange authorization code for tokens
    token_data = await deriv_client.exchange_oauth_code(
        code=code,
        code_verifier=code_verifier,
        redirect_uri=settings.DERIV_OAUTH_REDIRECT_URI
    )

    if "error" in token_data or "access_token" not in token_data:
        logger.error(f"Token exchange failed: {token_data}")
        return redirect(f"{settings.FRONTEND_URL}/deriv-callback?success=false&message=Failed+to+get+token+from+Deriv")

    # Save tokens to database
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

    # Clean up session
    request.session.pop("deriv_oauth_state", None)

    # === Dynamic Redirect Based on Originating Frontend ===
    frontend_origin = request.session.pop('deriv_frontend_origin', None)

    # Validate against allowed frontends
    allowed_frontends = getattr(settings, 'ALLOWED_DERIV_FRONTENDS', {settings.FRONTEND_URL})
    if not frontend_origin or frontend_origin not in allowed_frontends:
        frontend_origin = settings.FRONTEND_URL
        logger.info(f"Unknown frontend, falling back to default: {frontend_origin}")

    success_msg = urllib.parse.quote("Deriv account connected successfully")

    final_redirect = (
        f"{frontend_origin}/deriv-callback?"
        f"success=true&"
        f"message={success_msg}&"
        f"expires_at={expires_at.isoformat()}"
    )

    logger.info(f"✅ Deriv OAuth successful → Redirecting to {frontend_origin}")
    return redirect(final_redirect)


# ====================== ASYNC TRADING VIEWS ======================

class DerivProposalView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    async def post(self, request):
        token, error = await get_user_access_token(request)
        if error:
            return Response({"success": False, "message": error}, status=400)

        contract_data = request.data
        if not contract_data.get("contract_type") or not contract_data.get("symbol"):
            return Response({"error": "contract_type and symbol are required"}, status=400)

        try:
            result = await deriv_client.get_proposal(contract_data, token)
            if "proposal" in result:
                return Response({"success": True, "proposal": result["proposal"]})
            return Response({"success": False, "details": result}, status=400)
        except Exception as e:
            logger.error(f"Proposal error: {e}", exc_info=True)
            return Response({"success": False, "error": str(e)}, status=500)


class DerivBuyView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    async def post(self, request):
        token, error = await get_user_access_token(request)
        if error:
            return Response({"success": False, "message": error}, status=400)

        contract_data = request.data
        if not all(k in contract_data for k in ["contract_type", "symbol", "amount"]):
            return Response({"error": "contract_type, symbol, and amount are required"}, status=400)

        try:
            result = await deriv_client.buy_contract(contract_data, token)
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

    async def post(self, request):
        token, error = await get_user_access_token(request)
        if error:
            return Response({"success": False, "message": error}, status=400)

        contract_data = request.data
        if not contract_data.get("contract_id"):
            return Response({"error": "contract_id is required"}, status=400)

        try:
            result = await deriv_client.sell_contract(contract_data, token)
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

    async def get(self, request):
        token, error = await get_user_access_token(request)
        if error:
            return Response({"success": False, "message": error}, status=400)

        try:
            result = await deriv_client.get_balance(token)
            if "balance" in result:
                return Response({"success": True, "balance": result["balance"]})
            return Response({"success": False, "details": result}, status=400)
        except Exception as e:
            logger.error(f"Balance error: {e}", exc_info=True)
            return Response({"success": False, "error": str(e)}, status=500)


class DerivOpenContractView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    async def post(self, request):
        token, error = await get_user_access_token(request)
        if error:
            return Response({"success": False, "message": error}, status=400)

        contract_id = request.data.get("contract_id")
        subscribe = request.data.get("subscribe", True)

        if not contract_id:
            return Response({"error": "contract_id is required"}, status=400)

        try:
            result = await deriv_client.get_open_contract(
                contract_id=contract_id,
                access_token=token,
                subscribe=subscribe
            )
            return Response({
                "success": True,
                "contract": result.get("proposal_open_contract")
            })
        except Exception as e:
            logger.error(f"Open contract error: {e}", exc_info=True)
            return Response({"success": False, "error": str(e)}, status=500)