# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User, Account, SuspensionEvidence
from .serializers import UserSerializer, AccountSerializer, SuspensionEvidenceSerializer
from django.conf import settings
from django.db import transaction
from django.core.cache import cache
from django.utils.crypto import get_random_string
from django.utils import timezone
from datetime import timedelta
from rest_framework.permissions import AllowAny
from django.core.mail import send_mail
import random
import logging

logger = logging.getLogger('accounts')


class SignupView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data
        email = data.get('email')
        password = data.get('password')
        username = data.get('username')
        account_type = data.get('account_type', 'standard')
        phone = data.get('phone', '')
        referral_code = data.get('referral_code') or request.query_params.get('ref')

        if not email or not password or not username:
            return Response(
                {'error': 'Email, password, and username are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
            if not user.check_password(password):
                return Response({'error': 'Invalid password'}, status=status.HTTP_401_UNAUTHORIZED)

            if not user.can_create_account(account_type):
                return Response({'error': 'Cannot create this account type'}, status=status.HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                Account.objects.create(user=user, account_type=account_type)

        except User.DoesNotExist:
            # New user
            serializer = UserSerializer(data={'email': email, 'username': username, 'phone': phone})
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                user = serializer.save()
                user.set_password(password)
                user.save()
                # Auto-create demo + standard accounts
                Account.objects.create(user=user, account_type='demo')
                Account.objects.create(user=user, account_type='standard')

        # Authenticate the user
        user = authenticate(request=request, username=email, password=password)
        if not user:
            return Response({'error': 'Authentication failed after account creation'}, status=status.HTTP_401_UNAUTHORIZED)

        # Handle referral
        referrer = None
        if referral_code:
            try:
                referrer = User.objects.get(referral_code=referral_code, is_marketo=True)
                if user != referrer:
                    user.referred_by = referrer
                    user.save(update_fields=['referred_by'])

                    # Notify referrer with Resend
                    try:
                        send_mail(
                            subject="New Referral - Someone Joined via Your Link!",
                            message=(
                                f"Hello {referrer.username},\n\n"
                                f"A new user ({user.username} / {user.email}) has registered using your referral link.\n\n"
                                f"Thank you for spreading the word!\nTradeRiser Team"
                            ),
                            from_email=None,                    # Uses DEFAULT_FROM_EMAIL
                            recipient_list=[referrer.email],
                            html_message=f"""
                            <h2>New Referral Notification</h2>
                            <p>Hello <strong>{referrer.username}</strong>,</p>
                            <p>A new user has joined TradeRiser using your referral link:</p>
                            <p><strong>Username:</strong> {user.username}<br>
                               <strong>Email:</strong> {user.email}</p>
                            <p>Thank you for helping us grow!</p>
                            <p>Best regards,<br>TradeRiser Team</p>
                            """,
                            fail_silently=True,
                        )
                    except Exception as e:
                        logger.warning(f"Referral notification failed: {e}")

            except User.DoesNotExist:
                pass  # silent fail

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        active_account = user.accounts.filter(account_type=account_type).first() or user.accounts.get(account_type='standard')

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'active_account': AccountSerializer(active_account).data
        }, status=status.HTTP_201_CREATED)


class CreateAdditionalAccountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        account_type = request.data.get('account_type')
        if account_type != 'pro-fx':
            return Response({'error': 'Only pro-fx allowed'}, status=status.HTTP_400_BAD_REQUEST)

        if not request.user.can_create_account('pro-fx'):
            return Response({'error': 'Cannot create pro-fx'}, status=status.HTTP_400_BAD_REQUEST)

        account = Account.objects.create(user=request.user, account_type='pro-fx')
        return Response({
            'message': 'Pro-FX account created',
            'active_account': AccountSerializer(account).data
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        account_type = request.data.get('account_type', 'standard')

        if not email or not password:
            return Response({'error': 'Email and password required'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request=request, username=email, password=password)
        if not user or not user.is_active:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        # Clean up expired temporary suspensions
        was_suspended_before_cleanup = user.is_suspended
        user.clean_up_expired_suspension()

        # Detect recent recovery
        recently_recovered_temp = False
        recently_recovered_appeal = False

        if was_suspended_before_cleanup and not user.is_suspended:
            if user.suspension_history:
                last_entry = user.suspension_history[-1]
                if last_entry.get('type') == 'unsuspended':
                    entry_time = timezone.datetime.fromisoformat(last_entry['date'])
                    if timezone.now() - entry_time < timedelta(minutes=5):
                        recently_recovered_temp = True

        if not user.is_suspended and user.suspension_history:
            last_entry = user.suspension_history[-1]
            if last_entry.get('type') == 'unsuspended' and 'appeal approved' in last_entry.get('reason', '').lower():
                entry_time = timezone.datetime.fromisoformat(last_entry['date'])
                if timezone.now() - entry_time < timedelta(minutes=30):
                    recently_recovered_appeal = True

        active_account = (
            user.accounts.filter(account_type=account_type).first()
            or user.accounts.first()
        )

        refresh = RefreshToken.for_user(user)
        response_data = {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'active_account': AccountSerializer(active_account).data if active_account else None,
            'recently_recovered': recently_recovered_temp or recently_recovered_appeal,
            'recovered_type': 'temporary_expired' if recently_recovered_temp else 'appeal_approved' if recently_recovered_appeal else None,
        }

        if user.is_suspended:
            evidence_status = 'no_evidence'
            appeal_available = user.suspension_type == 'permanent'

            if user.suspension_type == 'permanent':
                latest_evidence = user.suspension_evidence.order_by('-created_at').first()
                if latest_evidence:
                    evidence_status = latest_evidence.status

            suspension_code = 'suspended_temporary' if user.suspension_type == 'temporary' else 'suspended_permanent'

            response_data['suspension'] = {
                'code': suspension_code,
                'details': {
                    'reason': user.suspension_reason or 'Your account has been suspended',
                    'until': user.suspended_until.isoformat() if user.suspension_type == 'temporary' and user.suspended_until else None,
                    'evidence_status': evidence_status,
                    'appeal_available': appeal_available,
                }
            }

        return Response(response_data, status=status.HTTP_200_OK)


class AppealSuspensionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not request.user.is_permanently_suspended:
            return Response({'error': 'Appeal only for permanent suspensions'}, status=400)

        description = request.data.get('description')
        evidence_file = request.FILES.get('evidence_file')

        if not description:
            return Response({'error': 'Description required'}, status=400)

        evidence, created = SuspensionEvidence.objects.get_or_create(
            user=request.user,
            defaults={'description': description, 'evidence_file': evidence_file}
        )
        if not created:
            evidence.description = description
            evidence.evidence_file = evidence_file
            evidence.status = 'pending'
            evidence.save()

        # Notify admin using Resend
        send_mail(
            subject=f"Appeal Submitted: {request.user.username}",
            message=f"User {request.user.email} appealed: {description}",
            from_email=None,
            recipient_list=['support@traderiser.com'],   # Change to your real support email
            html_message=f"""
            <h2>New Appeal Submitted</h2>
            <p><strong>User:</strong> {request.user.username} ({request.user.email})</p>
            <p><strong>Description:</strong> {description}</p>
            <p>Please review this appeal in the admin panel.</p>
            """,
            fail_silently=False,
        )

        return Response({
            'message': 'Appeal submitted successfully',
            'evidence': SuspensionEvidenceSerializer(evidence).data
        })


class AccountDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        serializer = UserSerializer(user)
        active_account = None
        active_wallet_id = request.session.get('active_wallet_account_id')

        if active_wallet_id:
            try:
                active_account = Account.objects.get(id=active_wallet_id, user=user)
            except Account.DoesNotExist:
                pass

        if not active_account:
            active_account = user.accounts.exclude(account_type='demo').first() or user.accounts.first()

        return Response({
            'user': serializer.data,
            'active_account': AccountSerializer(active_account).data if active_account else None
        }, status=status.HTTP_200_OK)


class ResetDemoBalanceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            account = Account.objects.get(user=request.user, account_type='demo')
            account.reset_demo_balance()
            from dashboard.models import Transaction
            Transaction.objects.filter(account=account).delete()

            return Response({
                'balance': account.balance,
                'message': 'Demo balance reset to 10,000 USD'
            }, status=status.HTTP_200_OK)
        except Account.DoesNotExist:
            return Response({'error': 'Demo account not found'}, status=status.HTTP_404_NOT_FOUND)


class SwitchWalletView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        account_id = request.data.get('account_id')
        try:
            account = Account.objects.get(id=account_id, user=request.user)
            if account.account_type == 'demo':
                return Response({'error': 'Cannot switch to demo via API'}, status=status.HTTP_400_BAD_REQUEST)

            return Response({
                'message': 'Switched successfully',
                'active_account': AccountSerializer(account).data
            })
        except Account.DoesNotExist:
            return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        otp = request.data.get('otp')
        cached = cache.get(f"otp_{email}")
        if cached and cached['code'] == otp and cached['expires'] > timezone.now():
            user = User.objects.get(email=email)
            user.is_email_verified = True
            user.save()
            cache.delete(f"otp_{email}")
            return Response({'success': True})
        return Response({'error': 'Invalid or expired code'}, status=400)


class ResendOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=400)

        code = get_random_string(length=6, allowed_chars='0123456789')
        expires = timezone.now() + timedelta(minutes=1)
        cache.set(f"otp_{email}", {'code': code, 'expires': expires}, timeout=60)

        # Send OTP using Resend
        send_mail(
            subject='Your TradeRiser Verification Code',
            message=f'Your verification code is: {code}',
            from_email=None,
            recipient_list=[email],
            html_message=f"""
            <h2>Your Verification Code</h2>
            <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">{code}</p>
            <p>This code will expire in 1 minute.</p>
            <p>If you did not request this, please ignore this email.</p>
            """,
            fail_silently=False,
        )
        return Response({'success': True})


class SashiToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        account_type = request.data.get('account_type', 'standard')
        try:
            account = Account.objects.get(user=request.user, account_type=account_type)
            if account.account_type in ['demo', 'pro-fx']:
                return Response({'error': 'Demo or Pro-FX accounts cannot toggle Sashi status'}, status=status.HTTP_400_BAD_REQUEST)

            user = request.user
            user.is_sashi = not user.is_sashi
            user.save()
            return Response({'is_sashi': user.is_sashi}, status=status.HTTP_200_OK)
        except Account.DoesNotExist:
            return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)


# ====================== PASSWORD RESET VIEWS ======================
@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    email = request.data.get('email')
    if not email:
        return Response({"error": "Email is required"}, status=400)

    try:
        User.objects.get(email=email)
    except User.DoesNotExist:
        # Don't reveal whether email exists (security)
        return Response({"message": "If the email exists, a reset code was sent."})

    code = ''.join(random.choices('0123456789', k=4))
    cache.set(f"pw_reset_{email}", code, timeout=300)

    send_mail(
        subject="TradeRiser Password Reset Code",
        message=f"Your 4-digit reset code is: {code}",
        from_email=None,
        recipient_list=[email],
        html_message=f"""
        <h2>Password Reset Request</h2>
        <p>Your 4-digit verification code is:</p>
        <p style="font-size: 32px; font-weight: bold;">{code}</p>
        <p>This code expires in 5 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
        """,
        fail_silently=False,
    )
    return Response({"message": "Reset code sent"})


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_verify(request):
    email = request.data.get('email')
    otp = request.data.get('otp')
    cached = cache.get(f"pw_reset_{email}")
    if cached != otp:
        return Response({"error": "Invalid code"}, status=400)
    return Response({"message": "Verified"})


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    email = request.data.get('email')
    otp = request.data.get('otp')
    new_password = request.data.get('new_password')
    confirm = request.data.get('confirm_password')

    if new_password != confirm:
        return Response({"error": "Passwords do not match"}, status=400)

    cached = cache.get(f"pw_reset_{email}")
    if cached != otp:
        return Response({"error": "Invalid or expired code"}, status=400)

    user = User.objects.get(email=email)
    user.set_password(new_password)
    user.save()
    cache.delete(f"pw_reset_{email}")
    return Response({"message": "Password reset successful"})