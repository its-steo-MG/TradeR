from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('transfer/', views.transfer_view, name='transfer'),
    path('statements/', views.statements_view, name='statements'),
    path('logout/', views.logout_view, name='logout'),
]