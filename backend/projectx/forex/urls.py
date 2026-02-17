# forex/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # ── Existing ──
    path('pairs/', views.ForexPairListView.as_view(), name='forex_pairs'),
    path('current-price/<int:pair_id>/', views.CurrentPriceView.as_view(), name='current_price'),
    path('current-prices/', views.CurrentPricesView.as_view(), name='current_prices'),
    path('orders/place/', views.PlaceOrderView.as_view(), name='place_order'),
    path('positions/', views.PositionListView.as_view(), name='positions'),
    path('positions/<int:position_id>/close/', views.ClosePositionView.as_view(), name='close_position'),
    path('positions/close-all/', views.CloseAllPositionsView.as_view(), name='close_all_positions'),
    path('history/', views.ForexTradeHistoryView.as_view(), name='trade_history'),

    # ── Robots ──
    path('robots/', views.ForexRobotListView.as_view(), name='forex_robot_list'),
    path('my-robots/', views.MyRobotsView.as_view(), name='my_robots'),
    path('robots/<int:robot_id>/purchase/', views.PurchaseRobotView.as_view(), name='purchase_robot'),
    path('robots/<int:user_robot_id>/toggle/', views.ToggleRobotView.as_view(), name='toggle_robot'),

    # ── Bot logs ──
    path('robot-logs/', views.BotLogListView.as_view(), name='bot_logs'),
    path('robot-logs/user-robot/<int:user_robot_id>/', views.BotLogListView.as_view(), name='bot_logs_by_user_robot'),
]