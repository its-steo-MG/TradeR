"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  username: string;
  email: string;
  isRealAccount: boolean;
  accountType: string;
}

export function DashboardHeader({
  username,
  email,
  isRealAccount,
  accountType,
}: DashboardHeaderProps) {
  const displayAccountType =
    accountType.charAt(0).toUpperCase() + accountType.slice(1);

  const [activeIndex, setActiveIndex] = useState(0);

  const platforms = [
    {
      name: "MT5",
      logo: "/mt5.png", 
      color: "from-orange-500 to-red-600",
      fill: true,
    },
    {
      name: "Traderiser",
      logo: "/images/traderiser-logo-192.png",
      color: "from-blue-500 to-purple-600",
      fill: false,
    },
    {
      name: "Deriv",
      logo: "/deriv-account-icon.png",
      color: "from-emerald-500 to-teal-600",
      fill: true,
    },
  ];

  // Auto-scroll effect
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % platforms.length);
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
      {/* Welcome Section */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/traderiser-logo-512-XQKYiMKYDs3FHo4yZyfpTS70vqF8qV.png"
              alt="Traderiser"
              className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-lg ring-2 ring-white/20"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-white via-purple-100 to-white bg-clip-text text-transparent tracking-tight">
            Welcome back, {username}
          </h1>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-4 py-2 rounded-full glass border border-white/15 text-xs sm:text-sm font-semibold uppercase tracking-widest bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 transition-all duration-300">
            {displayAccountType}
          </span>
          <span className="hidden sm:inline text-white/30">•</span>
          <span className="hidden sm:inline text-sm text-white/60">{email}</span>
        </div>
      </div>

      {/* Scrolling Platforms Banner */}
      <div className="glass rounded-3xl px-8 py-6 border border-white/10 backdrop-blur-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-center gap-6 relative"> {/* Reduced gap */}
          {platforms.map((plat, index) => {
            const isActive = index === activeIndex;
            
            // Increased logo sizes
            const logoSize = plat.fill ? 110 : 82;

            return (
              <div
                key={plat.name}
                className={cn(
                  "flex flex-col items-center transition-all duration-700 ease-out",
                  isActive ? "scale-125 opacity-100 z-10" : "scale-75 opacity-60"
                )}
              >
                {/* Clean logo - No card */}
                <div className="relative flex items-center justify-center">
                  <Image
                    src={plat.logo}
                    alt={plat.name}
                    width={logoSize}
                    height={logoSize}
                    className={cn(
                      "transition-all drop-shadow-md",
                      plat.fill 
                        ? "object-cover scale-110" 
                        : "object-contain"
                    )}
                  />
                </div>

                <p className={cn(
                  "text-xs font-medium mt-3 transition-colors",
                  isActive ? "text-white" : "text-white/50"
                )}>
                  {plat.name}
                </p>
              </div>
            );
          })}
        </div>

        {/* Subtle indicator */}
        <div className="flex justify-center gap-1 mt-5">
          {platforms.map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all",
                i === activeIndex ? "bg-white scale-125" : "bg-white/30"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}