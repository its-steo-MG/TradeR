// app/components/NotificationButton.tsx
'use client';
import { subscribeToPush } from '@/lib/push';
import { Button } from '@/components/ui/button'; // Assuming you use a component library

export function NotificationButton() {
  return (
    <Button onClick={subscribeToPush}>
      Enable Trading Alerts
    </Button>
  );
}