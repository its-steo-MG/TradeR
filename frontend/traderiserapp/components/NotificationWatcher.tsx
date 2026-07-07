"use client";

import { useNotifications } from "@/hooks/useNotifications";
import { useNotificationPopup } from "@/components/NotificationProvider";
import { useEffect } from "react";

export function NotificationWatcher() {
  const { popNotification } = useNotificationPopup();

  useNotifications((n) => {
    console.log("🎉 NEW NOTIFICATION RECEIVED & POPPING:", n);
    popNotification(n);
  });

  useEffect(() => {
    console.log("✅ NotificationWatcher is ACTIVE and mounted");
  }, []);

  return null;
}