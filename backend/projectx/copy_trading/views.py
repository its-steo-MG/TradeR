# copy_trading/views.py
from decimal import Decimal
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Trader, CopySubscription
from .serializers import TraderSerializer, CopySubscriptionSerializer
from accounts.models import Account


class TraderListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        traders = Trader.objects.filter(is_active=True)
        serializer = TraderSerializer(traders, many=True)
        return Response(serializer.data)


class BecomeTraderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if Trader.objects.filter(user=request.user).exists():
            return Response({'error': 'You are already a trader'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not request.user.accounts.filter(account_type__in=['standard', 'pro-fx']).exists():
            return Response({'error': 'You need a real account to become a trader'}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = TraderSerializer(data=request.data)
        if serializer.is_valid():
            trader = serializer.save(user=request.user)
            return Response(TraderSerializer(trader).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CopySubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        trader_id = request.data.get('trader')
        account_id = request.data.get('account')
        allocated_amount = request.data.get('allocated_amount')

        if not all([trader_id, account_id, allocated_amount]):
            return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            allocated_amount = Decimal(str(allocated_amount))  # Safe conversion
            trader = Trader.objects.get(id=trader_id, is_active=True)
            account = Account.objects.get(id=account_id, user=request.user, account_type__in=['standard', 'pro-fx'])

            # Balance check
            if allocated_amount > Decimal(str(account.balance)):
                return Response({'error': 'Insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)

            if allocated_amount < trader.min_allocation:
                return Response({'error': f'Minimum allocation is ${trader.min_allocation}'}, status=status.HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                subscription, created = CopySubscription.objects.get_or_create(
                    user=request.user,
                    account=account,
                    trader=trader,
                    defaults={
                        'allocated_amount': allocated_amount,
                        'is_active': True
                    }
                )
                if not created:
                    # Resume or update existing
                    subscription.allocated_amount = allocated_amount
                    subscription.is_active = True
                    subscription.save()

            return Response(CopySubscriptionSerializer(subscription).data, status=status.HTTP_201_CREATED)

        except (Trader.DoesNotExist, Account.DoesNotExist):
            return Response({'error': 'Trader or Account not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, subscription_id):
        try:
            subscription = CopySubscription.objects.get(id=subscription_id, user=request.user)
            subscription.is_active = False
            subscription.save()
            return Response({'message': 'Subscription paused successfully'}, status=status.HTTP_200_OK)
        except CopySubscription.DoesNotExist:
            return Response({'error': 'Subscription not found'}, status=status.HTTP_404_NOT_FOUND)


class UserSubscriptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        subscriptions = CopySubscription.objects.filter(user=request.user)
        serializer = CopySubscriptionSerializer(subscriptions, many=True)
        return Response(serializer.data)