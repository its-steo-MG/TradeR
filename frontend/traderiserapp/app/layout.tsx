// app/layout.tsx
import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import { Suspense } from "react"

import ClientWrapper from "@/components/ClientWrapper"
import InstallButton from "@/components/InstallButton"
import SuspensionGuard from "@/components/SuspensionGuard"
import NotificationProvider from "@/components/NotificationProvider"
import { NotificationWatcher } from "@/components/NotificationWatcher"
import { ThemeProvider } from "@/components/ThemeProvider"

import "./globals.css"

export const metadata: Metadata = {
  title: "TradeRiser – Next-Gen Trading with Smart Automation",
  description:
    "Trade binary options, forex, crypto, and synthetic indices with advanced automation",
  generator: "v0.app",
  manifest: "/manifest.json",
  icons: {
    icon: [
      {
        url: "/images/traderiser-logo-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/images/traderiser-logo-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        url: "/images/traderiser-logo-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/images/traderiser-logo-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/images/traderiser-logo-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1f2937" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="default"
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center bg-background">
                <img
                  src="/images/traderiser-logo-192.png"
                  alt="Traderiser Logo"
                  className="h-auto w-48"
                />
              </div>
            }
          >
            <NotificationProvider>
              <ClientWrapper>
                {children}
                <SuspensionGuard />
                <InstallButton />
              </ClientWrapper>

              <NotificationWatcher />
            </NotificationProvider>
          </Suspense>

          <Toaster
            theme="system"
            richColors
            position="top-right"
            expand={true}
            visibleToasts={3}
            closeButton
            toastOptions={{
              duration: 4000,
              className:
                "bg-card text-card-foreground border border-border backdrop-blur-xl",
            }}
          />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}