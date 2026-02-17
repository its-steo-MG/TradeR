# copy_trading/admin.py
from django.contrib import admin
from django.utils.html import format_html
from .models import Trader, CopySubscription, TradeSignal, CopiedTrade
from trading.models import Trade
from decimal import Decimal


@admin.register(Trader)
class TraderAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'risk_level_display',
        'performance_fee_percent',
        'min_allocation',
        'is_active',
        'win_rate_display',
        'average_return_display',
        'subscriber_count'
    )
    list_filter = ('risk_level', 'is_active')
    search_fields = ('user__username', 'user__email', 'bio')
    readonly_fields = ('created_at',)

    def risk_level_display(self, obj):
        colors = {'low': 'green', 'medium': 'orange', 'high': 'red'}
        color = colors.get(obj.risk_level, 'gray')
        return format_html(
            '<span style="color: white; background-color: {}; padding: 4px 10px; border-radius: 6px; font-weight: bold;">{}</span>',
            color,
            obj.get_risk_level_display()
        )
    risk_level_display.short_description = "Risk Level"

    def win_rate_display(self, obj):
        rate = obj.win_rate
        if rate == Decimal('0.00') and Trade.objects.filter(user=obj.user).count() == 0:
            return "N/A"
        return f"{rate:.2f}%"
    win_rate_display.short_description = "Win Rate"

    def average_return_display(self, obj):
        ret = obj.average_return
        if ret == Decimal('0.00') and Trade.objects.filter(user=obj.user).count() == 0:
            return "N/A"
        
        if ret > 0:
            color = "limegreen"
        elif ret < 0:
            color = "crimson"
        else:
            color = "gray"
        
        formatted_ret = f"{ret:+.2f}"
        
        return format_html(
            '<span style="font-weight: bold; color: {};">{}%</span>',
            color,
            formatted_ret
        )
    average_return_display.short_description = "Avg Return"

    def subscriber_count(self, obj):
        return obj.subscriber_count
    subscriber_count.short_description = "Subscribers"


@admin.register(CopySubscription)
class CopySubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'account',
        'trader',
        'allocated_amount',
        'max_drawdown_percent',
        'is_active',
        'created_at'
    )
    list_filter = ('is_active', 'trader__risk_level', 'created_at')
    search_fields = (
        'user__username',
        'trader__user__username',
        'account__account_type'
    )
    readonly_fields = ('created_at', 'updated_at')


@admin.register(TradeSignal)
class TradeSignalAdmin(admin.ModelAdmin):
    list_display = (
        'trader',
        'market',
        'trade_type',
        'direction',
        'amount',
        'entry_spot',
        'is_closed',
        'profit',
        'created_at'
    )
    list_filter = ('is_closed', 'direction', 'market', 'created_at')
    search_fields = ('trader__user__username', 'market__name')
    readonly_fields = ('created_at',)


@admin.register(CopiedTrade)
class CopiedTradeAdmin(admin.ModelAdmin):
    list_display = (
        'subscription',
        'signal',
        'scaled_amount',
        'profit',
        'fee_paid',
        'created_at'
    )
    list_filter = ('created_at', 'subscription__trader__risk_level')
    search_fields = (
        'subscription__user__username',
        'subscription__trader__user__username',
        'signal__trader__user__username'
    )
    readonly_fields = (
        'subscription',
        'signal',
        'trade',
        'scaled_amount',
        'profit',
        'fee_paid',
        'created_at'
    )
    date_hierarchy = 'created_at'

    # CRITICAL FIX: Prevent manual creation to avoid NOT NULL errors
    def has_add_permission(self, request):
        return False  # CopiedTrade is auto-created only via signals

    # Optional: Allow deletion for cleanup, but prevent changing data
    def has_change_permission(self, request, obj=None):
        return False  # Make all existing records read-only

    # Extra safety
    def get_actions(self, request):
        actions = super().get_actions(request)
        if 'delete_selected' in actions:
            del actions['delete_selected']  # Optional: disable bulk delete
        return actions