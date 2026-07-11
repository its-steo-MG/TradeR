# customercare/signals.py  – UPDATED
# Admin emails now open /admin-customercare (not Django admin)

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import ChatThread, Message
import logging

User = get_user_model()
logger = logging.getLogger('customercare')


@receiver(post_save, sender=User)
def create_support_thread(sender, instance, created, **kwargs):
    """Create a support thread and welcome message for new users."""
    if created:
        thread, thread_created = ChatThread.objects.get_or_create(user=instance)

        if thread_created:
            Message.objects.create(
                thread=thread,
                sender=None,
                content="Welcome to TradeRiser Support! 👋\nHow may we assist you today?",
                is_system=True,
                is_read=True
            )
            logger.info(f"Official welcome message created for new user {instance.id}")


@receiver(post_save, sender=Message)
def notify_on_new_message(sender, instance, created, **kwargs):
    """
    Notify user when staff replies, or notify admins when user sends a message.
    Optimized for Resend with proper HTML emails.
    """
    if not created:
        return

    thread = instance.thread
    user = thread.user

    # Skip pure automatic system messages
    if instance.is_system and (instance.sender is None or not instance.sender.is_staff):
        return

    try:
        if instance.sender and instance.sender.is_staff:
            # === STAFF REPLIED → NOTIFY USER ===
            if not user.email:
                logger.warning(f"User {user.id} has no email; skipping notification.")
                return

            subject = "New Message from TradeRiser Support"

            # Plain text version
            message = f"""Hi {user.username},

You have a new reply from our support team:

{instance.content}

View the full conversation here:
{settings.FRONTEND_URL}/customer-care

Sent at: {instance.sent_at.strftime('%Y-%m-%d %H:%M:%S UTC')}

Best regards,
TradeRiser Support Team"""

            # Beautiful HTML version for Resend
            html_message = f"""
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 30px; background-color: #ffffff; }}
                    .header {{ color: #0066cc; font-size: 24px; margin-bottom: 15px; }}
                    .message-box {{
                        background-color: #f8f9fa;
                        padding: 20px;
                        border-left: 5px solid #007bff;
                        border-radius: 4px;
                        margin: 20px 0;
                    }}
                    .button {{
                        display: inline-block;
                        background-color: #007bff;
                        color: white;
                        padding: 12px 20px;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 15px 0;
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h2 class="header">New Support Reply</h2>
                    <p>Hi <strong>{user.username}</strong>,</p>
                    <p>You have a new message from our support team:</p>

                    <div class="message-box">
                        {instance.content}
                    </div>

                    <p>
                        <a href="{settings.FRONTEND_URL}/customer-care" class="button">
                            View Conversation in Chat
                        </a>
                    </p>

                    <small>Sent at: {instance.sent_at.strftime('%Y-%m-%d %H:%M:%S UTC')}</small>

                    <p>Best regards,<br>
                    <strong>TradeRiser Support Team</strong></p>
                </div>
            </body>
            </html>
            """

            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=True,
            )
            logger.info(f"✅ Support reply notification sent to user: {user.email}")

        else:
            # === USER SENT MESSAGE → NOTIFY ADMINS ===
            admin_emails = list(
                User.objects.filter(is_staff=True)
                .exclude(email='')
                .values_list('email', flat=True)
            )

            if not admin_emails:
                logger.warning("No admin emails found.")
                return

            subject = f"New Support Message from {user.username}"

            # Plain text version  ← UPDATED LINK
            message = f"""New Support Message Received

User: {user.username} ({user.email})
Account ID: {user.id}

Message:
{instance.content}

Open Admin Care Desk:
{settings.FRONTEND_URL}/admin-customercare

Sent at: {instance.sent_at.strftime('%Y-%m-%d %H:%M:%S UTC')}

TradeRiser System"""

            # HTML version  ← UPDATED LINK
            html_message = f"""
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 30px; background-color: #ffffff; }}
                    .header {{ color: #0066cc; font-size: 24px; margin-bottom: 15px; }}
                    .message-box {{
                        background-color: #f8f9fa;
                        padding: 20px;
                        border-left: 5px solid #007bff;
                        border-radius: 4px;
                        margin: 20px 0;
                    }}
                    .button {{
                        display: inline-block;
                        background-color: #007bff;
                        color: white;
                        padding: 12px 20px;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 15px 0;
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h2 class="header">New Support Message</h2>
                    <p><strong>User:</strong> {user.username} ({user.email})</p>
                    <p><strong>Account ID:</strong> {user.id}</p>

                    <div class="message-box">
                        {instance.content}
                    </div>

                    <p>
                        <a href="{settings.FRONTEND_URL}/admin-customercare"
                           class="button">
                            Open Admin Care Desk
                        </a>
                    </p>

                    <small>Sent at: {instance.sent_at.strftime('%Y-%m-%d %H:%M:%S UTC')}</small>

                    <p>TradeRiser System</p>
                </div>
            </body>
            </html>
            """

            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=admin_emails,
                html_message=html_message,
                fail_silently=True,
            )
            logger.info(f"✅ Admin notification sent to {len(admin_emails)} admins for new user message")

    except Exception as e:
        logger.error(f"Failed to send customer care notification: {str(e)}", exc_info=True)


@receiver(post_save, sender='customercare.CallSession')
def notify_staff_on_new_call(sender, instance, created, **kwargs):
    if not created or instance.status != 'pending':
        return

    admin_emails = list(
        User.objects.filter(is_staff=True)
        .exclude(email='')
        .values_list('email', flat=True)
    )
    if not admin_emails:
        return

    subject = f"🔴 Incoming Audio Call from {instance.user.username}"

    # UPDATED: button now goes to /admin-customercare
    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 30px;">
            <h2 style="color: #dc3545;">New Audio Call</h2>
            <p><strong>User:</strong> {instance.user.username} ({instance.user.email})</p>
            <p>
                <a href="{settings.FRONTEND_URL}/admin-customercare"
                   style="display:inline-block; background:#007bff; color:white;
                          padding:12px 24px; text-decoration:none; border-radius:5px;
                          font-weight:bold;">
                    ANSWER CALL IN ADMIN DESK
                </a>
            </p>
            <p style="font-size:13px; color:#666;">
                Open the Admin Care Desk and answer the call from there.
            </p>
        </div>
    </body>
    </html>
    """

    send_mail(
        subject=subject,
        message=f"Incoming call from {instance.user.username}. Open: {settings.FRONTEND_URL}/admin-customercare",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=admin_emails,
        html_message=html_message,
        fail_silently=True,
    )

    # Broadcast to call_center group (for real-time modal)
    try:
        channel_layer = get_channel_layer()
        call_data = {
            "type": "new_incoming_call",
            "call_id": instance.id,
            "user": {
                "id": instance.user.id,
                "username": instance.user.username,
            },
            "started_at": instance.started_at.isoformat() if instance.started_at else None,
        }
        async_to_sync(channel_layer.group_send)("call_center", call_data)
        logger.info(f"✅ Broadcast new incoming call #{instance.id} to call_center")
    except Exception as e:
        logger.error(f"Failed to broadcast call: {e}")