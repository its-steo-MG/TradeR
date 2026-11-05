# Example dedicated M-Pesa push subscription endpoint
# Place this in your notifications app (or mpesa app) and add the URL.

from django.conf import settings
from rest_framework.views import APIView
from rest_framework import permissions, serializers
from rest_framework.response import Response
from .models import PushSubscription   # adjust import if needed
from binance.delivery import valid_push_endpoint  # or copy the function


class MpesaSubscriptionSerializer(serializers.Serializer):
    endpoint = serializers.CharField(max_length=2048)
    keys = serializers.DictField(child=serializers.RegexField(r"^[A-Za-z0-9_-]+$", max_length=200))

    def validate(self, attrs):
        if not valid_push_endpoint(attrs["endpoint"]):
            raise serializers.ValidationError("Unsupported push provider")
        keys = attrs["keys"]
        if not keys.get("p256dh") or not keys.get("auth") or len(keys["auth"]) > 100:
            raise serializers.ValidationError("Invalid subscription keys")
        return attrs


class MpesaPushSubscriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        public = getattr(settings, "VAPID_PUBLIC_KEY", "") or getattr(settings, "BINANCE_WEB_PUSH_PUBLIC_KEY", "")
        ready = bool(public and (getattr(settings, "VAPID_PRIVATE_KEY", "") or getattr(settings, "BINANCE_WEB_PUSH_PRIVATE_KEY", "")))
        return Response({"public_key": public if ready else "", "configured": ready})

    def post(self, request):
        serializer = MpesaSubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        value = serializer.validated_data

        # Prevent one device from being silently moved between accounts
        if PushSubscription.objects.filter(endpoint=value["endpoint"]).exclude(user=request.user).exists():
            return Response(
                {"detail": "Disable notifications for the previous account on this device first."},
                status=409,
            )

        PushSubscription.objects.update_or_create(
            user=request.user,
            endpoint=value["endpoint"],
            defaults={"p256dh": value["keys"]["p256dh"], "auth": value["keys"]["auth"]},
        )
        return Response({"registered": True})

    def delete(self, request):
        endpoint = request.data.get("endpoint")
        if not isinstance(endpoint, str) or len(endpoint) > 2048:
            return Response({"detail": "Invalid endpoint"}, status=400)
        PushSubscription.objects.filter(user=request.user, endpoint=endpoint).delete()
        return Response(status=204)
