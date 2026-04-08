# trading/admin.py
from django.contrib import admin
from .models import MarketType, Market, TradeType, Robot, UserRobot, TradingSetting, Trade, Signal

@admin.register(MarketType)
class MarketTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'profit_multiplier')
    search_fields = ('name',)

@admin.register(Market)
class MarketAdmin(admin.ModelAdmin):
    list_display = ('name', 'market_type', 'profit_multiplier')
    list_filter = ('market_type',)
    search_fields = ('name',)

@admin.register(TradeType)
class TradeTypeAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(Robot)
class RobotAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_deriv_robot', 'price', 'discounted_price', 
                   'effective_price', 'win_rate', 'available_for_demo')
    list_filter = ('is_deriv_robot', 'available_for_demo')
    search_fields = ('name',)
    readonly_fields = ('effective_price',)

    # Make new fields easy to edit
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'image', 'price', 'discounted_price',
                      'available_for_demo', 'win_rate')
        }),
        ('Deriv Premium Robot Settings', {
            'fields': ('is_deriv_robot', 'deriv_access_key'),
            'classes': ('collapse',),
            'description': 'Only fill deriv_access_key if is_deriv_robot = True'
        }),
    )

@admin.register(UserRobot)
class UserRobotAdmin(admin.ModelAdmin):
    list_display = ('user', 'robot', 'purchased_at', 'purchased_price')
    list_filter = ('purchased_at',)
    search_fields = ('user__username', 'robot__name')

@admin.register(TradingSetting)
class TradingSettingAdmin(admin.ModelAdmin):
    list_display = ('martingale_multiplier',)
    # Ensure only one instance
    def has_add_permission(self, request):
        return not TradingSetting.objects.exists()

@admin.register(Trade)
class TradeAdmin(admin.ModelAdmin):
    list_display = ('user', 'market', 'trade_type', 'direction', 'amount', 'is_win', 'profit', 'timestamp')
    list_filter = ('is_win', 'used_martingale', 'timestamp')
    search_fields = ('user__username', 'market__name')
    readonly_fields = ('profit', 'session_profit_before')

@admin.register(Signal)
class SignalAdmin(admin.ModelAdmin):
    list_display = ('user', 'market', 'direction', 'probability', 'take_profit', 'stop_loss', 'generated_at')
    list_filter = ('direction', 'generated_at')
    search_fields = ('user__username', 'market__name')