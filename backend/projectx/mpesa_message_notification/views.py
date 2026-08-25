from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import MpesaNotification
from .serializers import MpesaNotificationSerializer
from accounts.authentication import SuspendedUserJWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from mpesa_simulator.models import MpesaUser


class MpesaNotificationsView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SuspendedUserJWTAuthentication]

    def get(self, request):
        try:
            # Return both M-Pesa + Equity messages for this user
            q = Q(user=request.user)

            if hasattr(request.user, 'mpesa_user') and request.user.mpesa_user:
                q |= Q(mpesa_user=request.user.mpesa_user)

            notifications = (
                MpesaNotification.objects
                .filter(q)
                .order_by('-created_at')[:50]
            )
            serializer = MpesaNotificationSerializer(notifications, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class MarkNotificationReadView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SuspendedUserJWTAuthentication]

    def post(self, request, pk):
        try:
            q = Q(pk=pk, user=request.user)
            if hasattr(request.user, 'mpesa_user') and request.user.mpesa_user:
                q |= Q(pk=pk, mpesa_user=request.user.mpesa_user)

            notification = MpesaNotification.objects.get(q)
            notification.is_read = True
            notification.save(update_fields=['is_read'])
            return Response({'status': 'read'})
        except MpesaNotification.DoesNotExist:
            return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)


class ConnectMessagesView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SuspendedUserJWTAuthentication]

    def post(self, request):
        return Response({
            'status': 'success',
            'message': 'Messages connected successfully'
        })


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