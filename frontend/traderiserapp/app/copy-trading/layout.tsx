import type React from "react"
import { Sidebar } from "@/components/sidebar"

export default function CopyTradingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Mock login type and account for layout scaffolding
  const loginType = "real"

  return (
    <div className="flex min-h-screen bg-black text-white">
      <Sidebar loginType={loginType} />
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8">{children}</div>
      </main>
    </div>
  )
}
