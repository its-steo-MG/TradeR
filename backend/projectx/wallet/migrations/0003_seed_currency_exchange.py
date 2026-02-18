# wallet/migrations/000X_seed_currency_exchange.py
from django.db import migrations
from decimal import Decimal

def seed_currencies_and_rates(apps, schema_editor):
    Currency = apps.get_model('wallet', 'Currency')
    ExchangeRate = apps.get_model('wallet', 'ExchangeRate')
    usd, _ = Currency.objects.get_or_create(
        code='USD', defaults={'name': 'US Dollar', 'symbol': '$', 'is_fiat': True, 'is_active': True}
    )
    ksh, _ = Currency.objects.get_or_create(
        code='KSH', defaults={'name': 'Kenyan Shilling', 'symbol': 'KSh', 'is_fiat': True, 'is_active': True}
    )
    ExchangeRate.objects.get_or_create(
        base_currency=ksh,
        target_currency=usd,
        defaults={'live_rate': Decimal('0.0078'), 'admin_withdrawal_rate': Decimal('0.0076')}  # Example rates: 1 KSH ≈ 0.0078 USD
    )

class Migration(migrations.Migration):
    dependencies = [('wallet', '0002_remove_otpcode_expires_at_otpcode_transaction_and_more')]  # Replace with latest wallet migration
    operations = [migrations.RunPython(seed_currencies_and_rates)]