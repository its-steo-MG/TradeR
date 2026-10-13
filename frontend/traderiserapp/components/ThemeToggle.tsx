"use client"

import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        className="drop-on-top relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary/50"
        aria-label="Toggle theme"
      >
        <span className="relative z-[1] h-4 w-4" />
      </button>
    )
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="drop-on-top relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary/60 hover:bg-secondary transition-colors"
      aria-label="Toggle theme"
    >
      <span className="relative z-[1]">
        {theme === "dark" ? (
          <Sun className="h-4 w-4 text-foreground" />
        ) : (
          <Moon className="h-4 w-4 text-foreground" />
        )}
      </span>
    </button>
  )
}