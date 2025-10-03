import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { AppProvider } from "@/contexts/AppContext"
import "./globals.css"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Joelify",
  description: "A Spotify-like music player powered by YouTube",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
        <script src="https://www.youtube.com/iframe_api" async></script>
      </head>
      <body>
        {/* Wrapped children with AppProvider and Suspense for global state */}
        <Suspense fallback={null}>
          <AppProvider>{children}</AppProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
