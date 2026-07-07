from django.contrib import admin
from django.utils.html import format_html
from .models import ForexPair, Position, ForexTrade, ForexRobot, UserRobot, BotLog


@admin.register(ForexPair)
class ForexPairAdmin(admin.ModelAdmin):
    list_display = ('name', 'base_currency', 'quote_currency', 'pip_value', 'spread')
    search_fields = ('name',)


@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    list_display = (
        'user', 
        'account_type',      # ← Shows Pro-FX or MT5
        'pair', 
        'direction', 
        'volume_lots', 
        'entry_price', 
        'floating_p_l', 
        'status'
    )
    list_filter = ('status', 'direction', 'account__platform', 'account__account_type')
    search_fields = ('user__username', 'pair__name')
    readonly_fields = ('entry_time', 'closed_at')

    def account_type(self, obj):
        if obj.account:
            return f"{obj.account.platform} - {obj.account.account_type}"
        return "—"
    account_type.short_description = "Account"


@admin.register(ForexTrade)
class ForexTradeAdmin(admin.ModelAdmin):
    list_display = ('position', 'close_price', 'realized_p_l', 'close_time', 'close_reason')
    list_filter = ('close_reason',)
    search_fields = ('position__user__username',)


@admin.register(ForexRobot)
class ForexRobotAdmin(admin.ModelAdmin):
    list_display = (
        'name', 
        'is_ea', 
        'max_open_positions', 
        'price', 
        'discounted_price', 
        'effective_price', 
        'stake_per_trade', 
        'profit_multiplier', 
        'best_markets', 
        'is_active', 
        'image_preview'
    )
    list_editable = ('profit_multiplier', 'discounted_price', 'is_ea', 'max_open_positions')
    list_filter = ('best_markets', 'is_active', 'is_ea')
    search_fields = ('name',)
    readonly_fields = ('image_preview', 'effective_price')

    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="height: 60px; border-radius: 8px;" />',
                obj.image.url
            )
        return "(No image)"
    image_preview.short_description = "Image"

    def effective_price(self, obj):
        return obj.effective_price
    effective_price.short_description = "Effective Price"


@admin.register(UserRobot)
class UserRobotAdmin(admin.ModelAdmin):
    list_display = (
        'user', 
        'robot', 
        'is_ea', 
        'max_open_positions', 
        'target_profit',
        'is_running', 
        'purchased_at'
    )
    list_filter = ('robot', 'is_running', 'is_ea')
    list_editable = ('target_profit',)
    search_fields = ('user__username', 'robot__name')


@admin.register(BotLog)
class BotLogAdmin(admin.ModelAdmin):
    list_display = ('user_robot', 'message', 'trade_result', 'profit_loss', 'timestamp')
    list_filter = ('trade_result',)
    readonly_fields = ('user_robot', 'message', 'trade_result', 'profit_loss', 'timestamp')
    search_fields = ('user_robot__user__username',)