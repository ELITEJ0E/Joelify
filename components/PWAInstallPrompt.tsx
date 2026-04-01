"use client"

import { useEffect, useState } from "react"
import { X, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Check if user has dismissed before
      const dismissedAt = localStorage.getItem("pwa-install-dismissed")
      const isInstalled = localStorage.getItem("pwa-installed")

      // 2 days in milliseconds
      const TWO_DAYS = 2 * 24 * 60 * 60 * 1000

      if (!isInstalled) {
        if (!dismissedAt || Date.now() - parseInt(dismissedAt) > TWO_DAYS) {
          setShowPrompt(true)
        }
      }
    }

    window.addEventListener("beforeinstallprompt", handler)

    // Optional: detect if PWA already installed
    window.addEventListener("appinstalled", () => {
      localStorage.setItem("pwa-installed", "true")
      setShowPrompt(false)
      console.log("✅ Joelify PWA installed successfully!")
    })

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      console.log("✅ User accepted the install prompt")
      localStorage.setItem("pwa-installed", "true")
    } else {
      console.log("❌ User dismissed install prompt")
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem("pwa-install-dismissed", Date.now().toString())
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 transition-all duration-700">
      <Card className="bg-white/[0.03] border border-white/[0.07] p-4 shadow-lg backdrop-blur-xl transition-all duration-500">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Install Joelify</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Add <span className="text-primary font-semibold">Joelify</span> to your home screen for quick access and better music vibes.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleInstall} className="flex-1 bg-primary hover:bg-primary/80 text-primary-foreground">
                <Download size={14} className="mr-2" />
                Install
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss} className="hover:bg-primary/15">
                Not now
              </Button>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            className="h-6 w-6 -mt-1 -mr-1 hover:bg-primary/15"
            aria-label="Dismiss"
          >
            <X size={14} />
          </Button>
        </div>
      </Card>
    </div>
  )
}
