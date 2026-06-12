"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { api, type MpesaNotification } from "@/lib/api";

const POLL_MS = 5000; // Temporarily make it faster for testing

export function useNotifications(onNew?: (n: MpesaNotification) => void) {
  const [items, setItems] = useState<MpesaNotification[]>([]);

  const seen = useRef<Set<number>>(new Set());
  const initialized = useRef(false);
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  const fetchOnce = useCallback(async () => {
    try {
      console.log("🔄 Fetching M-Pesa notifications...");
      const data = await api.listMpesaNotifications();
      console.log("📥 Notifications received from API:", data);

      setItems(data || []);

      if (!initialized.current) {
        data?.forEach((n) => seen.current.add(n.id));
        initialized.current = true;
      } else {
        for (const n of data || []) {
          if (!seen.current.has(n.id)) {
            seen.current.add(n.id);
            console.log("🆕 NEW NOTIFICATION DETECTED:", n);
            onNewRef.current?.(n);
          }
        }
      }
    } catch (e: any) {
      console.error("❌ Failed to fetch notifications:", e);
    }
  }, []);

  useEffect(() => {
    fetchOnce();
    const interval = setInterval(fetchOnce, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchOnce]);

  return { items };
}