# notifications/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import PushSubscription

class SavePushSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        endpoint = data.get("endpoint")
        keys = data.get("keys", {})

        if not endpoint or not keys.get("p256dh") or not keys.get("auth"):
            return Response({"error": "Invalid subscription"}, status=400)

        PushSubscription.objects.update_or_create(
            user=request.user,
            endpoint=endpoint,
            defaults={
                "p256dh": keys["p256dh"],
                "auth": keys["auth"],
                "user_agent": request.META.get("HTTP_USER_AGENT", "")[:255],
            }
        )
        return Response({"status": "subscribed"})