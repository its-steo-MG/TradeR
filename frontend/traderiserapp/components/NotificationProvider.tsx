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
    audioRef.current = new Audio("/sounds/mpesa-notification.mp3");
    audioRef.current.preload = "auto";
    audioRef.current.volume = 0.7;
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.log("Notification sound blocked by browser:", err);
      });
    }
  }, []);

  const popNotification = useCallback((n: MpesaNotification) => {
    setQueue((q) => [...q, n]);
    
    playNotificationSound();

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
      
      {/* Notification Container - Now appears ABOVE everything */}
      <div className="fixed top-0 inset-x-0 z-[9999] flex flex-col items-center pointer-events-none">
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