// app/lib/push.ts
export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: 'BBRbE_o7fqhjeE4vMrwvmOECZNgy2N7QbXvuDWnnBBkskv3dBgOImPsx_ibYalb-zONJjDvNjpvXrDAsgNsE6w0', // Replace with your VAPID public key
    });

    // Send subscription to your backend
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
  }
}