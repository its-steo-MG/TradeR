# mpesa_simulator/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser   # ← ADDED
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import MpesaUser,MpesaTransaction
from .serializers import MpesaUserSerializer, MpesaTransactionSerializer
from accounts.authentication import SuspendedUserJWTAuthentication

class ConnectMpesaView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SuspendedUserJWTAuthentication]
    parser_classes = [MultiPartParser, FormParser]               # ← ADDED

    def post(self, request):
        if not request.user.is_marketo:
            return Response({'error': 'Only marketers can connect to M-Pesa app'}, status=status.HTTP_403_FORBIDDEN)
        
        real_name = request.data.get('real_name')
        phone_number = request.data.get('phone_number')
        pin = request.data.get('pin')
        profile_photo = request.FILES.get('profile_photo')

        if not real_name or not pin or len(pin) != 4 or not pin.isdigit():
            return Response({'error': 'Valid real name and 4-digit PIN required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # New: Check for unique PIN across all other users
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
    permission_classes = []  # Public for fake app login

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
            serializer = MpesaUserSerializer(mpesa_user)   # ← CHANGED: use serializer
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
        except AttributeError:  # in case mpesa_user doesn't exist
            return Response({'error': 'M-Pesa profile not connected'}, status=status.HTTP_404_NOT_FOUND)