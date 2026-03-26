# management/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db import transaction
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.core.mail import send_mail
from django.conf import settings
from decimal import Decimal
import json
import logging
import requests

from .models import ManagementRequest
from .serializers import ManagementRequestSerializer, InitiateManagementSerializer
from wallet.payment import PaymentClient

logger = logging.getLogger('management')


class InitiateManagementView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_usd_to_kes_rate(self):
        """Fetch live USD to KES rate from free API, fallback to 130."""
        try:
            response = requests.get('https://api.frankfurter.app/latest?from=USD&to=KES')
            response.raise_for_status()
            rate = Decimal(str(response.json()['rates']['KES']))
            logger.info(f"Fetched USD to KES rate: {rate}")
            return rate
        except Exception as e:
            logger.warning(f"Failed to fetch exchange rate: {e}. Using fallback 130.")
            return Decimal('130.00')

    def post(self, request):
        serializer = InitiateManagementSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        stake = serializer.validated_data['stake']
        target_profit = serializer.validated_data['target_profit']
        raw_phone = serializer.validated_data['mpesa_phone']
        account_type = serializer.validated_data['account_type']

        # Normalize phone
        phone = raw_phone.strip()
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        elif phone.startswith('+254'):
            phone = '254' + phone[4:]
        elif phone.startswith('7') or phone.startswith('1'):
            phone = '254' + phone
        elif not phone.startswith('254'):
            return Response({'error': 'Invalid Kenyan phone number format.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if len(phone) != 12 or not phone.isdigit():
            return Response({'error': 'Phone number must be a valid Kenyan mobile number.'}, status=status.HTTP_400_BAD_REQUEST)

        # Calculate payment in USD
        payment_amount_usd = target_profit * Decimal('0.20')

        # Convert to KES
        rate = self.get_usd_to_kes_rate()
        payment_amount_kes = payment_amount_usd * rate
        payment_amount_kes = payment_amount_kes.quantize(Decimal('1'))  # M-Pesa expects integers

        client = PaymentClient()
        transaction_ref = f"MGMT-{request.user.id}-{int(payment_amount_usd)}"

        response = client.initiate_stk_push(
            phone_number=phone,
            amount=float(payment_amount_kes),
            transaction_id=transaction_ref
        )

        if response.get('ResponseCode') != '0':
            logger.error(f"STK Push failed for {request.user}: {response}")
            return Response({
                'error': 'Failed to send payment request. Check your phone number and try again.',
                'details': response.get('errorMessage', 'Unknown error')
            }, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            mgmt = ManagementRequest.objects.create(
                user=request.user,
                stake=stake,
                target_profit=target_profit,
                payment_amount=payment_amount_usd,
                mpesa_phone=phone,
                account_type=account_type,
                merchant_request_id=response.get('MerchantRequestID'),
                checkout_request_id=response.get('CheckoutRequestID'),
                status='pending_payment'
            )

        return Response({
            'management_id': mgmt.management_id,
            'payment_amount': float(payment_amount_usd),
            'payment_amount_kes': float(payment_amount_kes),
            'message': 'STK Push sent! Complete payment on your phone.'
        }, status=status.HTTP_201_CREATED)


class SubmitCredentialsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        mgmt_id = request.data.get('management_id')
        email = request.data.get('account_email')
        password = request.data.get('account_password')

        try:
            mgmt = ManagementRequest.objects.get(
                management_id=mgmt_id,
                user=request.user,
                status='payment_verified'
            )
            mgmt.account_email = email
            mgmt.account_password = password
            mgmt.status = 'credentials_pending'
            mgmt.save()
            return Response({'message': 'Credentials submitted successfully.'}, status=status.HTTP_200_OK)
        except ManagementRequest.DoesNotExist:
            return Response({'error': 'Invalid or unauthorized request.'}, status=status.HTTP_400_BAD_REQUEST)


class ManagementStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        requests = ManagementRequest.objects.filter(user=request.user).order_by('-created_at')
        serializer = ManagementRequestSerializer(requests, many=True)
        return Response(serializer.data)


@csrf_exempt
def mpesa_management_callback(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid method'}, status=400)

    try:
        data = json.loads(request.body)
        logger.info(f"M-Pesa Callback: {data}")

        stk_callback = data.get('Body', {}).get('stkCallback', {})
        merchant_id = stk_callback.get('MerchantRequestID')
        checkout_id = stk_callback.get('CheckoutRequestID')
        result_code = stk_callback.get('ResultCode')

        if result_code == 0:  # Success
            items = stk_callback.get('CallbackMetadata', {}).get('Item', [])
            receipt = amount = phone = date = None

            for item in items:
                name = item.get('Name')
                value = item.get('Value')
                if name == 'MpesaReceiptNumber':
                    receipt = value
                elif name == 'Amount':
                    amount = Decimal(str(value))
                elif name == 'PhoneNumber':
                    phone = str(value)
                elif name == 'TransactionDate':
                    date_str = str(value)
                    date = timezone.datetime.strptime(date_str, '%Y%m%d%H%M%S')

            # Find and update management request
            mgmt = ManagementRequest.objects.filter(
                merchant_request_id=merchant_id,
                checkout_request_id=checkout_id,
                status='pending_payment'
            ).first()

            if mgmt:
                mgmt.mpesa_receipt_number = receipt
                mgmt.payment_date = date
                mgmt.status = 'payment_verified'   # This triggers the signal in models.py
                mgmt.save()

                logger.info(f"Payment received and status set to payment_verified: {mgmt.management_id}")

                # === SEND BEAUTIFUL EMAIL TO ADMIN ===
                try:
                    admin_url = f"{settings.FRONTEND_URL}/admin/management/managementrequest/{mgmt.id}/change/"

                    subject = "New Management Payment Received – Review Required 📩"

                    # Plain text version
                    message = f"""Hello Admin,

A new payment has been successfully received via M-Pesa for account management.

User: {mgmt.user.username} ({mgmt.user.email})
Management ID: {mgmt.management_id}
Stake: ${mgmt.stake}
Target Profit: ${mgmt.target_profit}
Account Type: {mgmt.get_account_type_display()}
Payment Amount: ${mgmt.payment_amount}
M-Pesa Receipt: {receipt}
Phone: {mgmt.mpesa_phone}
Date: {date}

Review in Admin Panel:
{admin_url}

User has been notified. Awaiting credentials submission.

TradeRiser System"""

                    # HTML version (much more professional)
                    html_message = f"""
                    <html>
                    <head>
                        <style>
                            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                            .container {{ max-width: 650px; margin: 0 auto; padding: 20px; }}
                            .highlight {{ background-color: #f8f9fa; padding: 20px; border-left: 5px solid #0066cc; border-radius: 4px; }}
                            table {{ border-collapse: collapse; width: 100%; margin: 15px 0; }}
                            th, td {{ padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }}
                            th {{ background-color: #f1f1f1; }}
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h2>New Management Payment Received 📩</h2>
                            <p>Hello Admin,</p>
                            <p>A new payment has been successfully received via M-Pesa for account management.</p>
                            
                            <div class="highlight">
                                <table>
                                    <tr><th>User</th><td>{mgmt.user.username} ({mgmt.user.email})</td></tr>
                                    <tr><th>Management ID</th><td><strong>{mgmt.management_id}</strong></td></tr>
                                    <tr><th>Stake</th><td>${mgmt.stake}</td></tr>
                                    <tr><th>Target Profit</th><td>${mgmt.target_profit}</td></tr>
                                    <tr><th>Account Type</th><td>{mgmt.get_account_type_display()}</td></tr>
                                    <tr><th>Payment Amount</th><td><strong>${mgmt.payment_amount}</strong></td></tr>
                                    <tr><th>M-Pesa Receipt</th><td>{receipt}</td></tr>
                                    <tr><th>Phone</th><td>{mgmt.mpesa_phone}</td></tr>
                                    <tr><th>Date</th><td>{date}</td></tr>
                                </table>
                            </div>

                            <p><strong>Action Required:</strong> Please review this request in the admin panel and start management once credentials are submitted.</p>
                            
                            <p><a href="{admin_url}" style="color: #0066cc; text-decoration: underline;">Review in Admin Panel →</a></p>

                            <p>User has been notified via email and is now expected to submit trading account credentials.</p>

                            <p>Best regards,<br>
                            <strong>TradeRiser System</strong></p>
                        </div>
                    </body>
                    </html>
                    """

                    send_mail(
                        subject=subject,
                        message=message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[settings.ADMIN_EMAIL],
                        html_message=html_message,
                        fail_silently=True,   # Safer for callback
                    )
                    logger.info(f"✅ Admin notification email sent for {mgmt.management_id}")

                except Exception as e:
                    logger.error(f"Failed to send admin email for payment {mgmt.management_id}: {e}")

            else:
                logger.warning("No matching management request found for callback.")

        else:
            logger.warning(f"Payment failed: {stk_callback.get('ResultDesc')}")

    except Exception as e:
        logger.error(f"Callback processing error: {str(e)}")

    return JsonResponse({"ResultCode": 0, "ResultDesc": "Accepted"})