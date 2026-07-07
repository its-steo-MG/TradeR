from django.db import models
from django.conf import settings
from decimal import Decimal


class MT5Position(models.Model):
    """
    Stores open MT5 positions persistently in the database.
    This allows trades to survive logout/login.
    """
    SIDE_CHOICES = [
        ('buy', 'Buy'),
        ('sell', 'Sell'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='mt5_positions'
    )
    
    symbol = models.CharField(max_length=20)
    side = models.CharField(max_length=4, choices=SIDE_CHOICES)
    volume = models.DecimalField(max_digits=10, decimal_places=2)
    
    open_price = models.DecimalField(max_digits=15, decimal_places=5)
    current_price = models.DecimalField(max_digits=15, decimal_places=5)
    
    opened_at = models.DateTimeField(auto_now_add=True)
    
    swap = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    commission = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    # Future use
    sl = models.DecimalField(max_digits=15, decimal_places=5, null=True, blank=True)
    tp = models.DecimalField(max_digits=15, decimal_places=5, null=True, blank=True)

    class Meta:
        ordering = ['-opened_at']
        verbose_name = "MT5 Position"
        verbose_name_plural = "MT5 Positions"

    def __str__(self):
        return f"{self.user.username} | {self.symbol} {self.side.upper()} {self.volume}"