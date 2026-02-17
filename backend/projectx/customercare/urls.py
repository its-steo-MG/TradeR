# customercare/urls.py
from django.urls import path
from .views import (
    ChatThreadView, AdminBlockUserView, get_active_threads,
    AdminChatView, MarkMessagesReadView, RequestReviewView
)

urlpatterns = [
    path('chat/', ChatThreadView.as_view(), name='chat'),
    path('chat/review/', RequestReviewView.as_view(), name='request_review'),
    path('chat/mark-read/', MarkMessagesReadView.as_view(), name='chat_mark_read'),
    path('admin/threads/', get_active_threads, name='admin_threads'),

    # Admin
    path('admin/block/<int:user_id>/', AdminBlockUserView.as_view(), name='admin_block'),
    path('admin/chat/<int:user_id>/', AdminChatView.as_view(), name='admin_chat'),
]