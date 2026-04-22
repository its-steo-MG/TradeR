# trading/migrations/0005_auto_20260418_1854.py

from decimal import Decimal
from django.db import migrations


def create_volatility_markets(apps, schema_editor):
    MarketType = apps.get_model('trading', 'MarketType')
    Market = apps.get_model('trading', 'Market')

    # 1. Create or update Volatility MarketType
    volatility_type, created = MarketType.objects.get_or_create(
        name='volatility',
        defaults={
            'profit_multiplier': Decimal('1.95'),
            'supports_digits': True,
        }
    )

    if created:
        print("✅ Created MarketType: 'volatility' with supports_digits=True")
    else:
        volatility_type.supports_digits = True
        volatility_type.profit_multiplier = Decimal('1.95')
        volatility_type.save()
        print("✅ Updated MarketType: 'volatility' (now supports digits)")

    # 2. List of Volatility Markets
    markets_data = [
        # Volatility 1s (Most popular for digit trading)
        ('volatility-10-1s', 'Volatility 10 (1s)', 10),
        ('volatility-25-1s', 'Volatility 25 (1s)', 25),
        ('volatility-50-1s', 'Volatility 50 (1s)', 50),
        ('volatility-75-1s', 'Volatility 75 (1s)', 75),
        ('volatility-100-1s', 'Volatility 100 (1s)', 100),

        # Standard Volatility
        ('volatility-10', 'Volatility 10', 10),
        ('volatility-25', 'Volatility 25', 25),
        ('volatility-50', 'Volatility 50', 50),
        ('volatility-75', 'Volatility 75', 75),
        ('volatility-100', 'Volatility 100', 100),

        # Boom / Crash (Very popular)
        ('boom-500', 'Boom 500 Index', None),
        ('crash-500', 'Crash 500 Index', None),
        ('boom-1000', 'Boom 1000 Index', None),
        ('crash-1000', 'Crash 1000 Index', None),

        # Jump Index
        ('jump-10-1s', 'Jump 10 (1s)', 10),
        ('jump-50-1s', 'Jump 50 (1s)', 50),
        ('jump-100-1s', 'Jump 100 (1s)', 100),

        # Range Break
        ('range-break-100', 'Range Break 100 Index', None),
        ('range-break-200', 'Range Break 200 Index', None),
    ]

    created_count = 0
    for internal_name, display_name, vol_index in markets_data:
        market, created = Market.objects.get_or_create(
            name=internal_name,
            defaults={
                'market_type': volatility_type,
                'display_name': display_name,
                'volatility_index': vol_index,
            }
        )
        if created:
            created_count += 1
            print(f"✅ Created: {display_name}")
        else:
            # Update if market already exists
            market.market_type = volatility_type
            market.display_name = display_name
            if vol_index is not None:
                market.volatility_index = vol_index
            market.save()
            print(f"✅ Updated: {display_name}")

    print(f"\n🎉 Migration completed successfully! {created_count} Volatility markets added.")


class Migration(migrations.Migration):
    dependencies = [
        ('trading', '0004_alter_trade_options_market_display_name_and_more'),
    ]

    operations = [
        migrations.RunPython(create_volatility_markets),
    ]