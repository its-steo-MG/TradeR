// app/layout.tsx
import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import { Suspense } from "react";
import ClientWrapper from "@/components/ClientWrapper";
import InstallButton from '@/components/InstallButton';
import SuspensionGuard from '@/components/SuspensionGuard';   // ← new import

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "TradeRiser – Next-Gen Trading with Smart Automation",
  description: "Trade binary options, forex, crypto, and synthetic indices with advanced automation",
  generator: "v0.app",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/images/traderiser-logo-192.png", sizes: "192x192", type: "image/png" },
      { url: "/images/traderiser-logo-512.png", sizes: "512x512", type: "image/png" },
      { url: "/images/traderiser-logo-maskable-192.png", sizes: "192x192", type: "image/png" },
      { url: "/images/traderiser-logo-maskable-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/images/traderiser-logo-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1f2937" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-800 to-gray-900">
              <img
                src="/images/traderiser-logo-192.png"
                alt="Traderiser Logo"
                className="w-48 h-auto"
              />
            </div>
          }
        >
          <ClientWrapper>
            {children}
            <SuspensionGuard />          {/* ← use the imported component */}
            <InstallButton />
          </ClientWrapper>

          <Toaster 
            theme="dark"
            richColors
            position="top-right"
            expand={true}
            visibleToasts={3}
            closeButton
            toastOptions={{
              duration: 4000,
              style: {
                background: "linear-gradient(to bottom right, #1f2937, #111827)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.2)",
                backdropFilter: "blur(20px)",
              },
            }}
          />
        </Suspense>
        <Analytics />
      </body>
    </html>
  );
}