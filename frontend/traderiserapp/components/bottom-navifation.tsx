"use client"

import { useState, useEffect } from "react"
import { TrendingUp, History, Home, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface BottomNavigationProps {
  currentPage: string
  onPageChange: (page: string) => void
}

export default function BottomNavigation({ currentPage, onPageChange }: BottomNavigationProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }
      setLastScrollY(currentScrollY)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  const navItems = [
    { id: "main", label: "Home", icon: Home },
    { id: "robots", label: "Bots", icon: Zap },
    { id: "trades", label: "Trades", icon: TrendingUp },
    { id: "history", label: "History", icon: History },
  ]

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-2xl transition-transform duration-300 ease-out",
        isVisible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="flex items-center justify-around h-20 max-w-md mx-auto w-full md:max-w-2xl">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id

          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-all duration-200",
                isActive
                  ? "bg-primary/20 text-primary scale-110"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
