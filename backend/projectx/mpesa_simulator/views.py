# mpesa_simulator/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction
from decimal import Decimal

from rest_framework_simplejwt.tokens import RefreshToken
from .models import MpesaUser, MpesaTransaction
from .serializers import MpesaUserSerializer, MpesaTransactionSerializer
from accounts.authentication import SuspendedUserJWTAuthentication


class ConnectMpesaView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SuspendedUserJWTAuthentication]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if not request.user.is_marketo:
            return Response({'error': 'Only marketers can connect to M-Pesa app'}, status=status.HTTP_403_FORBIDDEN)
        
        real_name = request.data.get('real_name')
        phone_number = request.data.get('phone_number')
        pin = request.data.get('pin')
        profile_photo = request.FILES.get('profile_photo')

        if not real_name or not pin or len(pin) != 4 or not pin.isdigit():
            return Response({'error': 'Valid real name and 4-digit PIN required'}, status=status.HTTP_400_BAD_REQUEST)
        
        existing_users = MpesaUser.objects.exclude(user=request.user)
        for eu in existing_users:
            if eu.check_pin(pin):
                return Response({'error': 'This PIN is already in use by another user. Choose a different one.'}, status=status.HTTP_400_BAD_REQUEST)
        
        mpesa_user, created = MpesaUser.objects.get_or_create(user=request.user)
        mpesa_user.real_name = real_name
        
        if phone_number:
            mpesa_user.phone_number = phone_number.strip()
            
        mpesa_user.set_pin(pin)
        
        if profile_photo:
            mpesa_user.profile_photo = profile_photo
        
        mpesa_user.save()
        
        return Response({'message': 'Connected to M-Pesa app successfully'}, status=status.HTTP_200_OK)


class MpesaLoginView(APIView):
    permission_classes = []  

    def post(self, request):
        phone_number = request.data.get('phone_number')
        pin = request.data.get('pin')
        
        if not phone_number or not pin:
            return Response({'error': 'Phone number and PIN required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            mpesa_user = MpesaUser.objects.get(phone_number=phone_number)
            if not mpesa_user.check_pin(pin):
                raise ValueError
            if mpesa_user.user.is_suspended:
                return Response({'error': 'Account suspended'}, status=status.HTTP_403_FORBIDDEN)
            
            refresh = RefreshToken.for_user(mpesa_user.user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            })
        except (MpesaUser.DoesNotExist, ValueError):
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


class MpesaBalanceView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SuspendedUserJWTAuthentication]

    def get(self, request):
        try:
            mpesa_user = request.user.mpesa_user
            return Response({'balance': str(mpesa_user.balance)})
        except MpesaUser.DoesNotExist:
            return Response({'error': 'M-Pesa not connected'}, status=status.HTTP_404_NOT_FOUND)


class MpesaTransactionsView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SuspendedUserJWTAuthentication]

    def get(self, request):
        try:
            mpesa_user = request.user.mpesa_user
            transactions = mpesa_user.transactions.all()[:20]
            serializer = MpesaTransactionSerializer(transactions, many=True)
            return Response(serializer.data)
        except MpesaUser.DoesNotExist:
            return Response({'error': 'M-Pesa not connected'}, status=status.HTTP_404_NOT_FOUND)


class MpesaProfileView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SuspendedUserJWTAuthentication]

    def get(self, request):
        try:
            mpesa_user = request.user.mpesa_user
            serializer = MpesaUserSerializer(mpesa_user)
            return Response(serializer.data)
        except MpesaUser.DoesNotExist:
            return Response({"error": "M-Pesa profile not found"}, status=status.HTTP_404_NOT_FOUND)


class MpesaTransactionDetailView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SuspendedUserJWTAuthentication]

    def get(self, request, pk):
        try:
            transaction = MpesaTransaction.objects.get(pk=pk, mpesa_user=request.user.mpesa_user)
            serializer = MpesaTransactionSerializer(transaction)
            return Response(serializer.data)
        except MpesaTransaction.DoesNotExist:
            return Response({'error': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)
        except AttributeError:
            return Response({'error': 'M-Pesa profile not connected'}, status=status.HTTP_404_NOT_FOUND)


# ====================== IMPROVED SEND MONEY ======================
class SendMoneyView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SuspendedUserJWTAuthentication]

    def post(self, request):
        try:
            sender = request.user.mpesa_user
        except MpesaUser.DoesNotExist:
            return Response({'error': 'M-Pesa not connected'}, status=status.HTTP_404_NOT_FOUND)

        recipient_phone = request.data.get('recipient_phone')
        amount = request.data.get('amount')
        description = request.data.get('description', '')
        pin = request.data.get('pin')

        if not recipient_phone or not amount or not pin:
            return Response({'error': 'recipient_phone, amount and pin are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(amount))
            if amount <= 0:
                return Response({'error': 'Amount must be greater than 0'}, status=status.HTTP_400_BAD_REQUEST)
        except:
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

        # Check PIN
        if not sender.check_pin(pin):
            return Response({'error': 'Invalid PIN'}, status=status.HTTP_401_UNAUTHORIZED)

        # Check daily limit
        if amount > sender.get_remaining_daily_limit():
            return Response({
                'error': f'Daily limit exceeded. You can only send up to {sender.get_remaining_daily_limit():,.2f} KSH today.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check sufficient balance
        if sender.balance < amount:
            return Response({'error': 'Insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)

        # Find recipient
        try:
            recipient = MpesaUser.objects.get(phone_number=recipient_phone.strip())
            if recipient.pk == sender.pk:
                return Response({'error': 'You cannot send money to yourself'}, status=status.HTTP_400_BAD_REQUEST)
        except MpesaUser.DoesNotExist:
            return Response({
                'error': 'This phone number is not registered on M-Pesa'
            }, status=status.HTTP_404_NOT_FOUND)

        # Process atomically
        with transaction.atomic():
            # Deduct from sender
            sender.balance -= amount
            sender.record_daily_withdrawal(amount)
            sender.save(update_fields=['balance'])

            # Credit recipient
            recipient.balance += amount
            recipient.save(update_fields=['balance'])

            # Create Withdrawal for sender
            withdrawal = MpesaTransaction(
                mpesa_user=sender,
                transaction_type='withdrawal',
                amount=amount,
                description=description,
                recipient_name=recipient.real_name,
                recipient_phone=recipient.phone_number,
                category='family_friends',
            )
            withdrawal.save()                     # ← This generates mpesa_id

            # Create Deposit for recipient
            deposit = MpesaTransaction(
                mpesa_user=recipient,
                transaction_type='deposit',
                amount=amount,
                description=description,
                recipient_name=sender.real_name,
                recipient_phone=sender.phone_number,
                category='family_friends',
            )
            deposit.save()                        # ← This also generates mpesa_id

        return Response({
            'message': 'Send money successful',
            'mpesa_id': withdrawal.mpesa_id,           # Sender's transaction ID
            'deposit_mpesa_id': deposit.mpesa_id,      # Receiver's transaction ID
            'recipient_name': recipient.real_name,
            'recipient_phone': recipient.phone_number,
            'amount': str(amount),
            'new_balance': str(sender.balance),
            'transaction_type': 'withdrawal'
        }, status=status.HTTP_200_OK)
    
    # ====================== NEW: RECIPIENT LOOKUP ======================
class RecipientLookupView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SuspendedUserJWTAuthentication]

    def post(self, request):
        """Lookup recipient by phone number - shows real name like real M-Pesa"""
        try:
            sender = request.user.mpesa_user
        except MpesaUser.DoesNotExist:
            return Response({'error': 'M-Pesa not connected'}, status=status.HTTP_404_NOT_FOUND)

        recipient_phone = request.data.get('recipient_phone')

        if not recipient_phone:
            return Response({'error': 'recipient_phone is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            recipient = MpesaUser.objects.get(phone_number=recipient_phone.strip())
            
            if recipient.pk == sender.pk:
                return Response({
                    'error': 'You cannot send money to yourself'
                }, status=status.HTTP_400_BAD_REQUEST)

            return Response({
                'recipient_name': recipient.real_name,
                'recipient_phone': recipient.phone_number,
                'exists': True,
                'message': f"Sending to {recipient.real_name}"
            })

        except MpesaUser.DoesNotExist:
            return Response({
                'error': 'This phone number is not registered on M-Pesa. Please check and try again.',
                'exists': False
            }, status=status.HTTP_404_NOT_FOUND)