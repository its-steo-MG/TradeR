"use client";

import { type ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";
import { useMT5Tick } from "@/lib/use-mt5-tick";

export default function MT5Shell({ children }: { children: ReactNode }) {
  useMT5Tick();
  const pathname = usePathname();
  
  const [hasAccount, setHasAccount] = useState(false);

  // Check if user has already selected an MT5 account
  useEffect(() => {
    const account = localStorage.getItem("mt5_account");
    const token = localStorage.getItem("access_token");
    
    setHasAccount(!!(account && token));
  }, [pathname]); // Re-check when route changes

  // Hide BottomNav only on pure login / connect flow
  const hideBottomNav = 
    (pathname === "/mt5" && !hasAccount) ||
    pathname?.startsWith("/mt5/connect") ||
    pathname?.startsWith("/mt5/login");

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {children}
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}