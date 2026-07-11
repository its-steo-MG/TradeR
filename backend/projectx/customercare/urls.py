# customercare/urls.py
from django.urls import path
from .views import (
    ChatThreadView, AdminBlockUserView, get_active_threads,
    AdminChatView, MarkMessagesReadView, RequestReviewView,
    InitiateAudioCallView, AnswerCallView, EndCallView, MissedCallsView,
    AdminSendEmailView, AdminMarkMessagesReadView,
)

urlpatterns = [
    path('chat/', ChatThreadView.as_view(), name='chat'),
    path('chat/review/', RequestReviewView.as_view(), name='request_review'),
    path('chat/mark-read/', MarkMessagesReadView.as_view(), name='chat_mark_read'),
    path('admin/threads/', get_active_threads, name='admin_threads'),

    # Admin
    path('admin/block/<int:user_id>/', AdminBlockUserView.as_view(), name='admin_block'),
    path('admin/chat/<int:user_id>/', AdminChatView.as_view(), name='admin_chat'),
    path('admin/chat/<int:user_id>/mark-read/', AdminMarkMessagesReadView.as_view(), name='admin_mark_read'),
    path('call/initiate/', InitiateAudioCallView.as_view(), name='call_initiate'),
    path('call/answer/<int:call_id>/', AnswerCallView.as_view(), name='call_answer'),
    path('call/end/<int:call_id>/', EndCallView.as_view(), name='call_end'),
    path('call/missed/', MissedCallsView.as_view(), name='missed_calls'),
    path('admin/send-email/', AdminSendEmailView.as_view(), name='admin_send_email'),
]
