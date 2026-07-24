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
    list_display = (
        'name', 
        'is_deriv_robot', 
        'is_s_digit_robot', 
        'is_bulk_robot',          # ← NEW
        'default_digit_contract_type',
        'max_bulk_trades',        # ← NEW
        'price', 
        'discounted_price', 
        'effective_price', 
        'win_rate', 
        'available_for_demo'
    )
    list_filter = (
        'is_deriv_robot', 
        'is_s_digit_robot', 
        'is_bulk_robot',          # ← NEW
        'available_for_demo'
    )
    search_fields = ('name',)
    readonly_fields = ('effective_price',)

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
        ('S-Digit Robot Settings', {
            'fields': ('is_s_digit_robot', 'default_digit_contract_type'),
            'classes': ('collapse',),
            'description': 'Only for S-Digit Robots (Over/Under, Matches/Differs, Even/Odd)'
        }),
        ('Bulk Trades AI Settings', {          # ← NEW SECTION
            'fields': ('is_bulk_robot', 'max_bulk_trades'),
            'classes': ('collapse',),
            'description': 'Only for Bulk Trades AI robots. max_bulk_trades = how many trades the robot can place in one request (1-50)'
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
    # Enhanced list_display to show both regular and digit trades clearly
    list_display = (
        'user', 
        'market', 
        'trade_type', 
        'direction', 
        'is_digit_trade', 
        'digit_contract_type', 
        'digit_barrier', 
        'last_digit_outcome',
        'amount', 
        'is_win', 
        'profit', 
        'timestamp'
    )
    
    # Better filtering for digit vs regular trades
    list_filter = (
        'is_win', 
        'used_martingale', 
        'is_digit_trade', 
        'digit_contract_type', 
        'timestamp'
    )
    
    search_fields = ('user__username', 'market__name')
    
    readonly_fields = (
        'profit', 
        'session_profit_before',
        'last_digit_outcome'   # Good to see the actual outcome
    )

    # Make admin interface cleaner by grouping fields
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'account', 'market', 'trade_type', 'direction', 'amount', 'timestamp')
        }),
        ('Trade Result', {
            'fields': ('is_win', 'profit', 'session_profit_before')
        }),
        ('Martingale & Robot', {
            'fields': ('used_martingale', 'martingale_level', 'used_robot'),
            'classes': ('collapse',),
        }),
        ('S Digit Trading', {
            'fields': ('is_digit_trade', 'digit_contract_type', 'digit_barrier', 'last_digit_outcome'),
            'classes': ('collapse',),
            'description': 'Only filled for S Digit (Over/Under/Matches etc.) trades'
        }),
        ('Additional Data', {
            'fields': ('is_demo', 'is_copied', 'entry_spot', 'exit_spot', 'current_spot'),
            'classes': ('collapse',),
        }),
    )


@admin.register(Signal)
class SignalAdmin(admin.ModelAdmin):
    list_display = ('user', 'market', 'direction', 'probability', 'take_profit', 'stop_loss', 'generated_at')
    list_filter = ('direction', 'generated_at')
    search_fields = ('user__username', 'market__name')