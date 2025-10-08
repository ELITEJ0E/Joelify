"use client"

import { useState, useEffect } from "react"
import { Menu } from "lucide-react"
import { Sidebar } from "../components/Sidebar"
import { MainContent } from "../components/MainContent"
import { PlayerControls } from "../components/PlayerControls"
import { Button } from "@/components/ui/button"
import { useApp } from "@/contexts/AppContext"
import { LoadingScreen } from "@/components/LoadingScreen"
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt"

export default function Home() {
  const [currentView, setCurrentView] = useState<"home" | "search" | "playlist" | "liked" | "library">("home")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { volume, setVolume } = useApp()

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Space bar for play/pause
      if (e.code === "Space") {
        e.preventDefault()
        const playButton = document.querySelector('[aria-label*="Play"], [aria-label*="Pause"]') as HTMLButtonElement
        playButton?.click()
      }

      // Arrow keys for navigation
      if (e.code === "ArrowRight") {
        e.preventDefault()
        const nextButton = document.querySelector('[aria-label*="Next"]') as HTMLButtonElement
        nextButton?.click()
      }

      if (e.code === "ArrowLeft") {
        e.preventDefault()
        const prevButton = document.querySelector('[aria-label*="Previous"]') as HTMLButtonElement
        prevButton?.click()
      }

      // Arrow up/down for volume control
      if (e.code === "ArrowUp") {
        e.preventDefault()
        const newVolume = Math.min(100, volume + 5)
        setVolume(newVolume)
      }

      if (e.code === "ArrowDown") {
        e.preventDefault()
        const newVolume = Math.max(0, volume - 5)
        setVolume(newVolume)
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [volume, setVolume])

  return (
    <>
      <LoadingScreen />

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
          <MainContent view={currentView} />
        </div>
        <PlayerControls />
      </div>

      <PWAInstallPrompt />
    </>
  )
}
