from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.core import mail
from unittest.mock import patch
from .models import BinanceNotification
from .delivery import deliver_notification, valid_push_endpoint
from .push_views import PushSubscriptionView
from rest_framework.test import APIRequestFactory, force_authenticate

class NotificationDeliveryTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='test', email='test@example.test')
    def test_unconfirmed_sell_never_sends_success(self):
        notification = BinanceNotification.objects.create(user=self.user, title='Sell', body='Pending', data={'type': 'sell', 'status': 'processing'})
        deliver_notification(notification.pk)
        self.assertEqual(len(mail.outbox), 0)
    def test_completed_sell_sends_once(self):
        notification = BinanceNotification.objects.create(user=self.user, title='Sell completed', body='Payment confirmed', data={'type': 'sell', 'status': 'completed'})
        deliver_notification(notification.pk)
        deliver_notification(notification.pk)
        self.assertEqual(len(mail.outbox), 1)
    def test_notification_waits_until_commit(self):
        with patch('binance.delivery.deliver_notification') as send:
            with self.captureOnCommitCallbacks(execute=True):
                notification = BinanceNotification.objects.create(user=self.user, title='Credit', body='Received')
                send.assert_not_called()
            send.assert_called_once_with(notification.pk)
    def test_endpoint_does_not_allow_internal_urls(self):
        self.assertFalse(valid_push_endpoint('https://127.0.0.1/private'))
        self.assertFalse(valid_push_endpoint('http://fcm.googleapis.com/send'))
        self.assertFalse(valid_push_endpoint('https://fcm.googleapis.com.evil.test/send'))
        self.assertTrue(valid_push_endpoint('https://web.push.apple.com/test'))
    def test_cannot_reassign_other_accounts_device(self):
        from .models import BinancePushSubscription
        BinancePushSubscription.objects.create(user=self.user, endpoint='https://fcm.googleapis.com/test', auth='abc', p256dh='abc')
        other = get_user_model().objects.create_user(username='other')
        request = APIRequestFactory().post('/push/subscription/', {'endpoint': 'https://fcm.googleapis.com/test', 'keys': {'auth': 'abc', 'p256dh': 'abc'}}, format='json')
        force_authenticate(request, user=other)
        response = PushSubscriptionView.as_view()(request)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(BinancePushSubscription.objects.get().user_id, self.user.pk)


@override_settings(DEFAULT_FROM_EMAIL="noreply@example.test", BINANCE_NOTIFICATION_SITE_NAME="TradeRiser")
class TradeEmailTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='s', email='s@example.test', first_name='Sospeter', last_name='Chaka Samuel')
    def test_sell_success_email_matches_layout(self):
        from datetime import datetime, timezone as tz
        from .trade_emails import notify_trade_success
        with self.captureOnCommitCallbacks(execute=True):
            notify_trade_success(self.user, 'sell', crypto_amount='18', fiat_amount='2248', rate='126.16666667', fee='23', reference='N0281', when=datetime(2026,10,29,16,33,52,tzinfo=tz.utc))
        m = mail.outbox[0]
        self.assertEqual(m.subject, '[TradeRiser Sell Success] - 2026-10-29 16:33:52 (UTC)')
        html = m.alternatives[0][0]
        self.assertIn('Your sell order of 18 USDT has been successfully completed', html)
        self.assertIn('You received: 2248KES', html)
        self.assertIn('Name: SOSPETER CHAKA SAMUEL', html)
    def test_buy_success_email(self):
        from .trade_emails import notify_trade_success
        with self.captureOnCommitCallbacks(execute=True):
            notify_trade_success(self.user, 'buy', crypto_amount='9.64788937', fiat_amount='1300', rate='133.397052', fee='13', reference='N0181')
        html = mail.outbox[0].alternatives[0][0]
        self.assertTrue(mail.outbox[0].subject.startswith('[TradeRiser Purchase Success] - '))
        self.assertIn('Final Amount: 9.64788937USDT', html)
        self.assertIn('Amount: 1300KES', html)
