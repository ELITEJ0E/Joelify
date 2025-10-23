"use client"

import { useState, useEffect } from "react"
import { Menu } from "lucide-react"
import { Sidebar } from "../components/Sidebar"
import { MainContent } from "../components/MainContent"
import { PlayerControls } from "../components/PlayerControls"
import { Button } from "@/components/ui/button"
import { LoadingScreen } from "@/components/LoadingScreen"
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt"
import { useRouter, useSearchParams } from "next/navigation"  // ← ADD THIS
import { exchangeCodeForTokens } from "@/lib/spotifyAuth"     // ← ADD THIS

export default function Home() {
  const router = useRouter()              // ← ADD THIS
  const searchParams = useSearchParams()  // ← ADD THIS
  const [isLoading, setIsLoading] = useState(true)
  const [currentView, setCurrentView] = useState<"home" | "search" | "playlist" | "liked" | "library">("home")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const code = searchParams.get("code")
    if (code) {
      exchangeCodeForTokens(code)
        .then(() => {
          console.log("[Spotify] Authentication successful!")
          router.replace("/")
        })
        .catch((err) => {
          console.error("[Spotify] Token exchange failed:", err)
          router.replace(`/?spotify_error=${encodeURIComponent(err.message)}`)
        })
    }
  }, [searchParams, router])

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 3500)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <>
      <div className="flex flex-col h-screen">
        <header className="lg:hidden bg-black text-white p-4 border-b border-border flex items-center gap-4">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsSidebarOpen(true)}
            className="text-gray-400 hover:text-white"
            aria-label="Open navigation menu"
          >
            <Menu size={24} />
          </Button>
          <h1 className="text-xl font-bold text-primary">Joelify</h1>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <Sidebar onNavigate={setCurrentView} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          <MainContent view={currentView} onNavigate={setCurrentView} />
        </div>

        <PlayerControls />
      </div>

      <PWAInstallPrompt />
    </>
  )
}
