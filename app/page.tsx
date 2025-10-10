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
  const [isLoading, setIsLoading] = useState(true)
  const [currentView, setCurrentView] = useState<"home" | "search" | "playlist" | "liked" | "library">("home")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { volume, setVolume } = useApp()

  // Track mute state separately
  const [isMuted, setIsMuted] = useState(false)

  // Only show homepage *after* loading screen completes
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 3500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.code) {
        case "Space":
          e.preventDefault()
          const playButton = document.querySelector(
            '[aria-label*="Play"], [aria-label*="Pause"]'
          ) as HTMLButtonElement
          playButton?.click()
          break

        case "ArrowUp":
          e.preventDefault()
          setVolume(Math.min(100, volume + 5))
          break

        case "ArrowDown":
          e.preventDefault()
          setVolume(Math.max(0, volume - 5))
          break

        case "KeyM":
          e.preventDefault()
          setIsMuted((prev) => {
            const newMuted = !prev
            setVolume(newMuted ? 0 : 100)
            return newMuted
          })
          break
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [volume, setVolume])

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
