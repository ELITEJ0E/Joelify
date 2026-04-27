"use client"

import { useState, useEffect } from "react"
import { AlertCircle, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export function FirestoreQuotaWarning() {
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false)

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes("Quota exceeded") || event.error?.message?.includes("Quota exceeded")) {
        setIsQuotaExceeded(true)
      }
    }

    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes("Quota exceeded") || String(event.reason)?.includes("Quota exceeded")) {
        setIsQuotaExceeded(true)
      }
    }

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handlePromiseRejection)

    return () => {
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handlePromiseRejection)
    }
  }, [])

  if (!isQuotaExceeded) return null

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[100] md:left-auto md:right-8 md:w-96 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <Alert variant="destructive" className="bg-red-950/90 border-red-500/50 backdrop-blur-xl text-white shadow-2xl">
        <AlertCircle className="h-4 w-4 text-red-400" />
        <AlertTitle className="text-red-400 font-bold">Firestore Quota Exceeded</AlertTitle>
        <AlertDescription className="mt-2 text-sm text-red-100/80 leading-relaxed">
          The application has reached its free tier database write limit for today. 
          <p className="mt-2">
            Your settings and playlists will continue to be saved locally on this device, 
            but cloud syncing is temporarily disabled.
          </p>
          <p className="mt-2 font-medium text-white">
            The quota will automatically reset tomorrow.
          </p>
          <div className="mt-4 flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-white/10 border-white/20 hover:bg-white/20 text-white text-xs"
              onClick={() => window.open("https://firebase.google.com/pricing#cloud-firestore", "_blank")}
            >
              <Info className="mr-1 h-3 w-3" />
              Learn More
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white/60 hover:text-white text-xs"
              onClick={() => setIsQuotaExceeded(false)}
            >
              Dismiss
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}
