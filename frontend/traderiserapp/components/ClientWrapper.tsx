"use client"

import { usePathname } from "next/navigation";
import type React from "react";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isGradientPage = ["/", "/login", "/signup"].includes(pathname);

  return (
    <div className={isGradientPage ? "gradient-bg min-h-screen" : "min-h-screen"}>
      {children}
    </div>
  );
  
}