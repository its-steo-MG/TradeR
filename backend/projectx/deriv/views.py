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

class DerivOAuthLoginView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        prompt = request.query_params.get("prompt", "consent")
        frontend_url = request.query_params.get('frontend_url') or settings.FRONTEND_URL

        # Security: whitelist frontends
        allowed_frontends = getattr(settings, 'ALLOWED_DERIV_FRONTENDS', {settings.FRONTEND_URL})
        if frontend_url not in allowed_frontends:
            frontend_url = settings.FRONTEND_URL

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

        # Store session data
        request.session['deriv_pkce_verifier'] = code_verifier
        request.session['deriv_oauth_state'] = state
        request.session['deriv_frontend_origin'] = frontend_url

        # 🔥 CRITICAL FIX: Force Django to save the session immediately
        request.session.save()

        # === FIXED & SAFER AUTH URL ===
        redirect_uri = settings.DERIV_OAUTH_REDIRECT_URI.rstrip('/') + '/'

        auth_url = (
            f"https://auth.deriv.com/oauth2/auth?"
            f"response_type=code"
            f"&client_id={settings.DERIV_APP_ID}"
            f"&redirect_uri={urllib.parse.quote(redirect_uri)}"
            f"&scope=trade"
            f"&state={state}"
            f"&code_challenge={code_challenge}"
            f"&code_challenge_method=S256"
            f"&prompt={prompt}"
        )

        logger.info(f"Using redirect_uri: {redirect_uri}")
        logger.info(f"Full auth_url: {auth_url}")
        logger.info(f"Deriv Auth URL generated with app_id: {settings.DERIV_APP_ID}")
        logger.info(f"Session Key: {request.session.session_key}")  # Helpful for debugging

        return Response({
            "success": True,
            "auth_url": auth_url,
            "message": "Redirect the user to this URL"
        })
    
# ====================== OAUTH CALLBACK (Multi-Frontend Support) ======================

# views.py
from django.http import HttpResponseRedirect
from django.contrib.sessions.backends.db import SessionStore

@csrf_exempt
async def deriv_oauth_callback(request):
    """Improved OAuth Callback"""
    code = request.GET.get("code")
    state = request.GET.get("state")
    error = request.GET.get("error")

    if error:
        logger.error(f"Deriv OAuth error: {error}")
        return redirect_to_frontend(request, success=False, message=f"Deriv error: {error}")

    if not code:
        logger.warning("No code received from Deriv")
        return redirect_to_frontend(request, success=False, message="No authorization code received")

    # === CRITICAL: Get session from state (more reliable) ===
    stored_state = request.session.get("deriv_oauth_state")
    
    if not stored_state or state != stored_state:
        logger.warning(f"State mismatch! Got: {state}, Expected: {stored_state}")
        
        # Optional: Try to recover from DB if you want (advanced)
        return redirect_to_frontend(request, success=False, message="Session expired or state mismatch. Please try again.")

    code_verifier = request.session.pop("deriv_pkce_verifier", None)
    frontend_origin = request.session.pop("deriv_frontend_origin", None)

    if not code_verifier:
        return redirect_to_frontend(request, success=False, message="Session expired")

    # Exchange code for token
    token_data = await deriv_client.exchange_oauth_code(
        code=code,
        code_verifier=code_verifier,
        redirect_uri=settings.DERIV_OAUTH_REDIRECT_URI
    )

    if "error" in token_data or "access_token" not in token_data:
        logger.error(f"Token exchange failed: {token_data}")
        return redirect_to_frontend(request, success=False, message="Failed to get access token")

    # === Save to database ===
    try:
        user = request.user if request.user.is_authenticated else None
        
        # If user is not authenticated here (rare), we might need to pass user_id via session
        if not user or not user.is_authenticated:
            logger.error("User not authenticated in callback")
            return redirect_to_frontend(request, success=False, message="User session lost")

        expires_in = token_data.get("expires_in", 3600)
        expires_at = timezone.now() + timezone.timedelta(seconds=expires_in)

        DerivUserAccount.objects.update_or_create(
            user=user,
            defaults={
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token"),
                "expires_at": expires_at,
            }
        )

        logger.info(f"✅ Deriv account linked for user {user.username}")

    except Exception as e:
        logger.error(f"Error saving Deriv account: {e}", exc_info=True)
        return redirect_to_frontend(request, success=False, message="Failed to save account")

    # Clean session
    request.session.pop("deriv_oauth_state", None)
    request.session.pop("deriv_pkce_verifier", None)

    return redirect_to_frontend(request, success=True, message="Deriv account connected successfully")


def redirect_to_frontend(request, success=True, message=""):
    """Helper to redirect to correct frontend"""
    frontend_origin = request.session.get('deriv_frontend_origin') or settings.FRONTEND_URL
    
    allowed = getattr(settings, 'ALLOWED_DERIV_FRONTENDS', {settings.FRONTEND_URL})
    if frontend_origin not in allowed:
        frontend_origin = settings.FRONTEND_URL

    msg = urllib.parse.quote(message)
    final_url = f"{frontend_origin}/deriv-callback?success={str(success).lower()}&message={msg}"
    
    return HttpResponseRedirect(final_url)


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