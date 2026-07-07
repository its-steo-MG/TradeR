# trading/urls.py
from django.urls import path
from .views import (
    MarketListView,
    TradeTypeListView,
    RobotListView,
    PurchaseRobotView,
    UserRobotListView,
    PlaceTradeView,
    TradeHistoryView,
    ResetDemoBalanceView,
    GenerateSignalView,
    PlaceDigitTradeView,
    PlaceSRobotTradeView,          # ← NEW: S-Digit Robot Trade View
)

urlpatterns = [
    path('markets/', MarketListView.as_view(), name='market_list'),
    path('trade-types/', TradeTypeListView.as_view(), name='trade_type_list'),
    path('robots/', RobotListView.as_view(), name='robot_list'),
    path('robots/<int:robot_id>/purchase/', PurchaseRobotView.as_view(), name='purchase_robot'),
    path('user-robots/', UserRobotListView.as_view(), name='user_robot_list'),
    path('trades/place/', PlaceTradeView.as_view(), name='place_trade'),
    path('trades/history/', TradeHistoryView.as_view(), name='trade_history'),
    path('reset-demo-balance/', ResetDemoBalanceView.as_view(), name='reset_demo_balance'),
    path('signals/generate/', GenerateSignalView.as_view(), name='generate_signal'),
    path('trades/place-digit/', PlaceDigitTradeView.as_view(), name='place_digit_trade'),
    # NEW: S-Digit Robot Trade Endpoint
    path('trades/place-srobot/', PlaceSRobotTradeView.as_view(), name='place_srobot_trade'),
]