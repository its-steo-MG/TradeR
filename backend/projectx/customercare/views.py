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