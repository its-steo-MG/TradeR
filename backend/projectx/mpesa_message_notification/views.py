from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import MpesaNotification
from .serializers import MpesaNotificationSerializer
from accounts.authentication import SuspendedUserJWTAuthentication
from rest_framework.permissions import IsAuthenticated
from accounts.authentication import SuspendedUserJWTAuthentication
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from mpesa_simulator.models import MpesaUser

class MpesaNotificationsView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SuspendedUserJWTAuthentication]

    def get(self, request):
        try:
            notifications = MpesaNotification.objects.filter(
                mpesa_user=request.user.mpesa_user
            )[:50]
            serializer = MpesaNotificationSerializer(notifications, many=True)
            return Response(serializer.data)
        except Exception:
            return Response({'error': 'M-Pesa not connected'}, status=status.HTTP_404_NOT_FOUND)

class MarkNotificationReadView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SuspendedUserJWTAuthentication]

    def post(self, request, pk):
        try:
            notification = MpesaNotification.objects.get(
                pk=pk, 
                mpesa_user=request.user.mpesa_user
            )
            notification.is_read = True
            notification.save()
            return Response({'status': 'read'})
        except MpesaNotification.DoesNotExist:
            return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)
        
class ConnectMessagesView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SuspendedUserJWTAuthentication]

    def post(self, request):
        """Mark messages as connected for the user"""
        try:
            # You can add logic here later (e.g. create a flag in User or MpesaUser)
            # For now, we just return success so frontend stops showing "Connect" button
            return Response({
                'status': 'success',
                'message': 'Messages connected successfully'
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
class MpesaMessagesLoginView(APIView):
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