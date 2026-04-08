# customercare/views.py
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes 
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from .models import ChatThread, Message
from .serializers import ChatThreadSerializer, MessageSerializer
from .permissions import IsOwnerOrAdmin
from accounts.models import User
import logging

logger = logging.getLogger('customercare')

class ChatThreadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        thread, created = ChatThread.objects.get_or_create(user=request.user)
        serializer = ChatThreadSerializer(thread, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        thread = request.user.support_thread
        if thread.is_blocked():
            return Response({
                "error": "You are blocked from sending messages.",
                "block_info": thread.get_block_message()
            }, status=status.HTTP_403_FORBIDDEN)

        content = request.data.get('content')
        if not content:
            return Response({"error": "Message content required"}, status=400)

        message = Message.objects.create(
            thread=thread,
            sender=request.user,
            content=content
        )
        # Mark previous unread admin messages as read
        thread.messages.filter(sender__is_staff=True, is_read=False).update(is_read=True)

        return Response(MessageSerializer(message, context={'request': request}).data, status=201)


# === ADMIN PANEL VIEWS ===
class AdminBlockUserView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, user_id):
        user = get_object_or_404(User, id=user_id)
        thread = user.support_thread
        action = request.data.get('action')  # 'temp', 'perm', 'unblock'
        reason = request.data.get('reason', 'Policy violation')

        with transaction.atomic():
            if action == 'temp':
                thread.block_temporarily(reason, hours=24)
            elif action == 'perm':
                thread.block_permanently(reason)
            elif action == 'unblock':
                thread.unblock()
            else:
                return Response({"error": "Invalid action"}, status=400)

        return Response({
            "status": "success",
            "block_info": thread.get_block_message()
        })


class AdminChatView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, user_id):
        user = get_object_or_404(User, id=user_id)
        thread = user.support_thread
        serializer = ChatThreadSerializer(thread, context={'request': request})
        return Response(serializer.data)

    def post(self, request, user_id):
        user = get_object_or_404(User, id=user_id)
        thread = user.support_thread
        content = request.data.get('content')
        if not content:
            return Response({"error": "Content required"}, status=400)

        is_system = request.data.get('is_system', False)  # Allow admin to mark as system message

        message = Message.objects.create(
            thread=thread,
            sender=request.user,
            content=content,
            is_system=is_system
        )
        return Response(MessageSerializer(message, context={'request': request}).data, status=201)


class RequestReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        thread = request.user.support_thread
        if not thread.is_permanently_blocked or thread.review_requested:
            return Response({"error": "Review not applicable"}, status=400)

        thread.review_requested = True
        thread.save()
        # Notify admin via email or task
        logger.info(f"Review requested by {request.user.id}")
        return Response({"message": "Review request submitted. We’ll get back within 48 hours."})
    
class MarkMessagesReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        thread = request.user.support_thread
        # Mark all admin messages as read
        updated = thread.messages.filter(
            sender__is_staff=True,
            is_read=False
        ).update(is_read=True)

        return Response({
            "message": f"{updated} message(s) marked as read",
            "status": "success"
        }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def get_active_threads(request):
    threads = ChatThread.objects.select_related('user').filter(is_active=True).order_by('-created_at')[:20]
    data = [{'id': t.id, 'user': {'id': t.user.id, 'username': t.user.username}, 'last_message': t.messages.last().content if t.messages.exists() else None, 'is_blocked': t.is_blocked()} for t in threads]
    return Response(data)

from .models import CallSession, CustomerCareSettings
from .serializers import CallSessionSerializer

class InitiateAudioCallView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Get or create thread
        thread, _ = ChatThread.objects.get_or_create(user=request.user)
        settings_obj = CustomerCareSettings.get_settings()

        call = CallSession.objects.create(
            user=request.user,
            thread=thread,
            status='pending'
        )

        return Response({
            "success": True,
            "call_id": call.id,
            "status": "pending",
            "hold_music_url": settings_obj.hold_music.url if settings_obj.hold_music else None,
            "welcome_audio_url": settings_obj.welcome_audio.url if settings_obj.welcome_audio else None,
            "welcome_text": settings_obj.welcome_text,
            "message": "Connecting you to the next available agent..."
        }, status=status.HTTP_201_CREATED)


from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class AnswerCallView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, call_id):
        call = get_object_or_404(CallSession, id=call_id, status__in=['pending', 'ringing'])

        # Strict staff check
        if not request.user.is_staff:
            logger.warning(f"Non-staff user {request.user.id} tried to answer call")
            return Response({"error": "Staff access only"}, status=status.HTTP_403_FORBIDDEN)

        voice_preset = request.data.get('voice_preset', 'default')
        valid_voices = ['default', 'lady', 'child', 'man']
        if voice_preset not in valid_voices:
            voice_preset = 'default'

        call.status = 'in_progress'
        call.answered_at = timezone.now()
        call.agent = request.user
        call.voice_preset = voice_preset
        call.save()

        # Notify the user who initiated the call
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"call_{call.user.id}",
            {
                "type": "call_answered",
                "call_id": call.id,
                "voice_preset": voice_preset,
                "agent": request.user.username
            }
        )

        logger.info(f"Staff {request.user.username} answered call #{call.id} with voice: {voice_preset}")

        return Response({
            "success": True,
            "call_id": call.id,
            "status": "in_progress",
            "voice_preset": voice_preset,
            "agent": request.user.username
        })
    
class EndCallView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, call_id):
        call = get_object_or_404(CallSession, id=call_id)

        # Only caller or staff can end the call
        if call.user != request.user and not request.user.is_staff:
            return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

        call.status = 'completed'
        call.ended_at = timezone.now()
        call.save()
        
    # Notify both sides that call ended
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"call_session_{call.id}",
            {
                "type": "call_ended",
                "call_id": call.id,
                "reason": "Call ended by user/agent"
            }
        )

        return Response({"success": True, "status": "completed"})


class MissedCallsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        missed_count = CallSession.objects.filter(
            user=request.user, 
            is_missed=True
        ).count()

        return Response({
            "missed_calls": missed_count,
            "has_unread": missed_count > 0
        })