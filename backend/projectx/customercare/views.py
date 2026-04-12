# customercare/views.py
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes 
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from django.core.mail import send_mail   
from django.conf import settings
from .models import ChatThread, Message,AdminEmail
from .serializers import ChatThreadSerializer, MessageSerializer,AdminEmailSerializer
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
    
# ====================== ADMIN SEND EMAIL ======================
class AdminSendEmailView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def send_professional_email(self, admin_email_obj):
        """Send beautiful professional email"""
        if not admin_email_obj.message:
            return False

        plain_message = admin_email_obj.message

        # Professional HTML Template
        html_message = f"""
        <html>
        <head>
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f4f6f9; }}
                .container {{ max-width: 650px; margin: 30px auto; padding: 40px; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }}
                .header {{ 
                    color: #0066cc; 
                    font-size: 28px; 
                    text-align: center; 
                    margin-bottom: 25px; 
                    border-bottom: 2px solid #eee;
                    padding-bottom: 15px;
                }}
                .content {{ 
                    font-size: 16px; 
                    line-height: 1.7; 
                    margin-bottom: 30px; 
                }}
                .footer {{ 
                    font-size: 14px; 
                    color: #777777; 
                    text-align: center; 
                    margin-top: 40px; 
                    padding-top: 20px; 
                    border-top: 1px solid #eee;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1 class="header">TradeRiser Official Communication</h1>
                
                <div class="content">
                    {admin_email_obj.html_message or admin_email_obj.message.replace('\n', '<br>')}
                </div>
                
                <div class="footer">
                    Best regards,<br>
                    <strong>TradeRiser Trading Team</strong><br>
                    <a href="{settings.FRONTEND_URL}" style="color: #0066cc;">{settings.FRONTEND_URL}</a>
                </div>
            </div>
        </body>
        </html>
        """

        try:
            if admin_email_obj.recipient_type == 'single' and admin_email_obj.target_user and admin_email_obj.target_user.email:
                recipient_list = [admin_email_obj.target_user.email]
            else:
                # Broadcast to all active users
                recipient_list = list(
                    User.objects.filter(is_active=True)
                    .exclude(email='')
                    .values_list('email', flat=True)
                )

            if not recipient_list:
                logger.warning("No valid email recipients found for admin email")
                return False

            send_mail(
                subject=admin_email_obj.subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=recipient_list,
                html_message=html_message,
                fail_silently=False,
            )

            logger.info(f"✅ Professional email sent | Type: {admin_email_obj.recipient_type} | Recipients: {len(recipient_list)} | Subject: {admin_email_obj.subject}")
            return True

        except Exception as e:
            logger.error(f"Failed to send professional admin email: {e}", exc_info=True)
            return False

    def post(self, request):
        subject = request.data.get('subject')
        message = request.data.get('message')
        html_message = request.data.get('html_message')
        recipient_type = request.data.get('recipient_type')
        user_id = request.data.get('user_id')

        if not all([subject, message, recipient_type]):
            return Response({"error": "subject, message and recipient_type are required"}, status=400)

        if recipient_type == 'single' and not user_id:
            return Response({"error": "user_id is required when recipient_type is 'single'"}, status=400)

        try:
            with transaction.atomic():
                if recipient_type == 'single':
                    target_user = get_object_or_404(User, id=user_id)
                    admin_email = AdminEmail.objects.create(
                        subject=subject,
                        message=message,
                        html_message=html_message,
                        recipient_type='single',
                        target_user=target_user,
                        sent_by=request.user
                    )
                else:
                    admin_email = AdminEmail.objects.create(
                        subject=subject,
                        message=message,
                        html_message=html_message,
                        recipient_type='all',
                        sent_by=request.user
                    )

                # Send the email
                email_sent = self.send_professional_email(admin_email)

                serializer = AdminEmailSerializer(admin_email)

                response_message = f"Email sent successfully to recipients" if email_sent else "Email record created but sending failed"

                return Response({
                    "success": email_sent,
                    "message": response_message,
                    "email": serializer.data
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Failed to process admin email request: {e}", exc_info=True)
            return Response({"error": "Internal server error"}, status=500)