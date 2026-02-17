from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Display Daniel Okoth Auma account information'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("\n=== KCB Bank Account Login ==="))
        
        username = input("Enter username: ").strip().lower()
        password = input("Enter password: ").strip()

        if username != "daniel" or password != "auma1010":
            self.stdout.write(self.style.ERROR("❌ Invalid username or password"))
            return

        self.stdout.write(self.style.SUCCESS("✅ Login successful!"))

        account_type = input("\nEnter account type (original / real): ").strip().lower()

        if account_type == "original":
            balance = 10_291_000
            acc_name = "Daniel Okoth Auma Account"
            acc_number = "4243142018001601-original data"
        elif account_type == "real":
            balance = 231_722_000
            acc_name = "Real Account"
            acc_number = "0112345678-REAL DATA"
        else:
            self.stdout.write(self.style.ERROR("❌ Invalid account type. Use 'original' or 'real'"))
            return

        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS("         KCB BANK ACCOUNT DETAILS"))
        self.stdout.write("="*60)
        self.stdout.write(f"Account Holder : Daniel Okoth Auma")
        self.stdout.write(f"Account Number : {acc_number}")
        self.stdout.write(f"Account Type   : {acc_name}")
        self.stdout.write(f"Balance        : KES {balance:,.2f}")
        self.stdout.write(f"Currency       : Kenyan Shillings (KES)")
        self.stdout.write(f"Status         : On hold")
        self.stdout.write("="*60)