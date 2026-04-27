"use client"

import { useState, useEffect } from "react"
import { Menu } from "lucide-react"
import { Sidebar } from "../components/Sidebar"
import { MainContent } from "../components/MainContent"
import { PlayerControls } from "../components/PlayerControls"
import { Button } from "@/components/ui/button"
import { LoadingScreen } from "@/components/LoadingScreen"
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt"
import { Suspense } from "react"

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [currentView, setCurrentView] = useState<"home" | "search" | "playlist" | "liked" | "library" | "stats" | "joels">("home")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 3500)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <>
      <div className="flex flex-col h-screen bg-gradient-to-br from-black via-primary/30 to-black animate-gradient-move text-foreground overflow-hidden">
        <header className="lg:hidden bg-black/80 backdrop-blur-xl text-white p-4 border-b border-white/[0.07] flex items-center gap-4 z-40 sticky top-0">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsSidebarOpen(true)}
            className="text-gray-400 hover:text-white hover:bg-primary/15 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu size={24} />
          </Button>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70 tracking-tight">Joelify</h1>
        </header>

        <div className="flex flex-1 overflow-hidden relative">
          <Suspense
            fallback={
              <div className="w-72 bg-black/40 backdrop-blur-xl border-r border-white/[0.07] flex-shrink-0 flex items-center justify-center z-30">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            }
          >
            <Sidebar onNavigate={setCurrentView} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          </Suspense>
          <MainContent view={currentView} onNavigate={setCurrentView} />
        </div>

        <PlayerControls />
      </div>

      <PWAInstallPrompt />
    </>
  )
}
