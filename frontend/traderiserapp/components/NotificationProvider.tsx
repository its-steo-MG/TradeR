"use client";

import { createContext, useCallback, useContext, useState, ReactNode, useRef, useEffect } from "react";
import type { MpesaNotification } from "@/lib/api";
import CallerPopup from "./CallerPopup";

type Ctx = {
  popNotification: (n: MpesaNotification) => void;
};

const NotificationCtx = createContext<Ctx>({ popNotification: () => {} });

export const useNotificationPopup = () => useContext(NotificationCtx);

export default function NotificationProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<MpesaNotification[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio once
  useEffect(() => {
    audioRef.current = new Audio("/sounds/mpesa-notification.mp3"); // ← Put your sound here
    audioRef.current.preload = "auto";
    audioRef.current.volume = 0.7; // Adjust volume (0.0 - 1.0)
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      // Reset and play
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        // Silent fail - autoplay may be blocked by browser
        console.log("Notification sound blocked by browser:", err);
      });
    }
  }, []);

  const popNotification = useCallback((n: MpesaNotification) => {
    setQueue((q) => [...q, n]);
    
    // Play sound when new notification pops
    playNotificationSound();

    // Optional haptic feedback
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.([60, 30, 60]);
    }
  }, [playNotificationSound]);

  const dismiss = useCallback((id: number) => {
    setQueue((q) => q.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationCtx.Provider value={{ popNotification }}>
      {children}
      
      {/* Notification Container */}
      <div className="fixed top-0 inset-x-0 z-50 flex flex-col items-center pointer-events-none">
        {queue.map((n) => (
          <CallerPopup 
            key={n.id} 
            notif={n} 
            onDone={() => dismiss(n.id)} 
          />
        ))}
      </div>
    </NotificationCtx.Provider>
  );
}