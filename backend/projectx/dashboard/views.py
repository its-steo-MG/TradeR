from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from accounts.models import User, Account
from accounts.serializers import UserSerializer
from .models import Transaction
from .serializers import TransactionSerializer
from wallet.models import WalletTransaction  # Import to delete wallet transactions on reset

class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        user_serializer = UserSerializer(user)
        accounts = Account.objects.filter(user=user)
        account_data = []
        for account in accounts:
            transactions = Transaction.objects.filter(account=account)
            transaction_serializer = TransactionSerializer(transactions, many=True)
            account_data.append({
                'account_type': account.account_type,
                'balance': account.balance,
                'transactions': transaction_serializer.data
            })
        return Response({
            'user': user_serializer.data,
            'accounts': account_data
        }, status=status.HTTP_200_OK)

class ResetDemoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        try:
            account = Account.objects.get(user=user, account_type='demo')
            account.reset_demo_balance()
            # Delete dashboard transactions
            Transaction.objects.filter(account=account).delete()
            # Also delete wallet transactions for full reset
            WalletTransaction.objects.filter(wallet__account=account).delete()
            return Response({'message': 'Demo balance reset to 10,000 USD'}, status=status.HTTP_200_OK)
        except Account.DoesNotExist:
            return Response({'error': 'Demo account not found'}, status=status.HTTP_404_NOT_FOUND)