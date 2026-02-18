// app/api/push/subscribe/route.ts
import { NextResponse } from 'next/server';
import webPush from 'web-push';

webPush.setVapidDetails(
  'mailto:support@traderiser.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
  const subscription = await request.json();
  // Save subscription to your database (e.g., MongoDB, Supabase)
  // Example: await db.subscriptions.insert(subscription);

  // Send a test notification
  await webPush.sendNotification(subscription, JSON.stringify({
    title: 'Welcome to Traderiser!',
    body: 'You’re now subscribed to trading alerts.',
    url: '/dashboard',
  }));

  return NextResponse.json({ success: true });
}