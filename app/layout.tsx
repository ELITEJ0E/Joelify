import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import { AppProvider } from "@/contexts/AppContext"
import { AudioAnalysisProvider } from "@/contexts/AudioAnalysisContext"
import "./globals.css"
import { Suspense } from "react"

import { TooltipProvider } from "@/components/ui/tooltip"
import { FirestoreQuotaWarning } from "@/components/FirestoreQuotaWarning"
import { PWARegister } from "@/components/PWARegister"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const viewport: Viewport = {
  themeColor: "#000000",
}

export const metadata: Metadata = {
  title: "Joelify",
  description: "A Spotify-like music player powered by YouTube",
  generator: "v0.app",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Joelify",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className={`${inter.className} select-none`} suppressHydrationWarning>
        <Script src="https://www.youtube.com/iframe_api" strategy="afterInteractive" />
        <Suspense fallback={null}>
          <TooltipProvider>
            <AppProvider>
              <AudioAnalysisProvider>{children}</AudioAnalysisProvider>
            </AppProvider>
          </TooltipProvider>
        </Suspense>
        
        <FirestoreQuotaWarning />
        <PWARegister />
      </body>
    </html>
  )
}
