# traderpulse/management/commands/seed_fake_traders.py
from django.core.management.base import BaseCommand
from traderpulse.models import FakeTrader
import random
import string

# Huge pools = zero chance of collision
FIRST_NAMES = [
    "Alex", "Max", "Luca", "Zoe", "Raj", "Omar", "Lina", "Viktor", "Sasha", "Marco",
    "Nina", "Dani", "Leo", "Ivan", "Tara", "Khalid", "Aisha", "Jade", "Ryan", "Luka",
    "Aria", "Diego", "Sofia", "Mateo", "Luna", "Kai", "Nico", "Eva", "Theo", "Amir"
]

LAST_PARTS = [
    "Pips", "Scalper", "Sniper", "Vol", "King", "Queen", "Fx", "Trader", "Edge", "Hedge",
    "Lord", "Guru", "Ninja", "Riser", "Wolf", "Shark", "Bull", "Bear", "Hawk", "Lion",
    "Viper", "Cobra", "Rogue", "Maverick", "Phantom", "Rebel", "Knight", "Samurai", "Pro", "Elite"
]

COUNTRIES = [
    ("USA", "United States"), ("UK", "United Kingdom"), ("Nigeria", "Nigeria"),
    ("India", "India"), ("Russia", "Russia"), ("Brazil", "Brazil"),
    ("South Africa", "South Africa"), ("UAE", "UAE"), ("Canada", "Canada"),
    ("Australia", "Australia"), ("Germany", "Germany"), ("France", "France"),
    ("Japan", "Japan"), ("China", "China"), ("Spain", "Spain")
]

AVATAR_BASE = "https://res.cloudinary.com/traderiser/image/upload/v1737000000/avatars/trader{}.png"

BIOS = [
    "Full-time trader | 5+ years", "Ex-investment banker gone rogue", "Scalping NAS100 daily",
    "Gold & EURUSD specialist", "Risk first, profit second", "HODL gang since 2017",
    "Discipline over greed", "London session warrior", "NY close scalper"
]

class Command(BaseCommand):
    help = "Seed 500+ unique fake traders (idempotent & safe to run 100x)"

    def handle(self, *args, **options):
        target_count = 500
        existing = FakeTrader.objects.count()

        if existing >= target_count:
            self.stdout.write(self.style.SUCCESS(f"Already have {existing} fake traders — skipping."))
            return

        created = 0
        attempts = 0
        max_attempts = target_count * 10  # safety

        while created < (target_count - existing) and attempts < max_attempts:
            attempts += 1

            # Generate truly unique username
            name_part = random.choice(FIRST_NAMES)
            suffix = random.choice(["", ""]) + random.choice(LAST_PARTS)  # force suffix
            number = random.randint(10, 9999)
            username = f"{name_part.lower()}{suffix.lower()}{number}"

            # Extra randomness if needed
            if random.random() < 0.3:
                username = f"{name_part.lower()}_{random.randint(11,999)}"

            # Ensure no duplicates
            if FakeTrader.objects.filter(username=username).exists():
                continue

            flag, country = random.choice(COUNTRIES)
            avatar_num = random.randint(1, 50)

            try:
                FakeTrader.objects.create(
                    name=f"{name_part} {suffix}",
                    username=username,
                    country=country,
                    country_flag=flag,
                    avatar_url=AVATAR_BASE.format(avatar_num) if random.random() > 0.2 else None,
                    bio=random.choice(BIOS),
                    profit_fake=round(random.uniform(-28.7, 687.4), 2),
                    is_premium=random.random() > 0.75
                )
                created += 1
            except Exception as e:
                # In case of race condition or anything — just skip
                continue

            if created % 50 == 0:
                self.stdout.write(f"Created {created} fake traders...")

        self.stdout.write(
            self.style.SUCCESS(f"SUCCESS! Total fake traders: {FakeTrader.objects.count()}")
        )