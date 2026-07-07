from django.urls import path
from .views import (
    CreateMT5AccountView, 
    MyMT5AccountsView, 
    SwitchMT5AccountView,
    MT5PositionListView,
    MT5OpenPositionView,
    MT5ClosePositionView
)

urlpatterns = [
    # MT5 Account Routes
    path('create-account/', CreateMT5AccountView.as_view(), name='mt5-create-account'),
    path('my-accounts/', MyMT5AccountsView.as_view(), name='mt5-my-accounts'),
    path('switch/', SwitchMT5AccountView.as_view(), name='mt5-switch'),

    # MT5 Position Routes
    path('positions/', MT5PositionListView.as_view(), name='mt5-positions-list'),
    path('positions/open/', MT5OpenPositionView.as_view(), name='mt5-open-position'),
    path('positions/close/', MT5ClosePositionView.as_view(), name='mt5-close-position'),
]