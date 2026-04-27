"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Play, Pause, SkipBack, SkipForward, X, Maximize2 } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useApp } from "@/contexts/AppContext"

interface MiniPlayerProps {
  isPlaying: boolean
  onPlayPause: () => void
  onNext: () => void
  onPrevious: () => void
  onClose: () => void
  onExpand: () => void
}

export function MiniPlayer({ isPlaying, onPlayPause, onNext, onPrevious, onClose, onExpand }: MiniPlayerProps) {
  const { currentTrack } = useApp()
  const [position, setPosition] = useState({ x: window.innerWidth - 380, y: window.innerHeight - 150 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return

      const newX = Math.max(0, Math.min(window.innerWidth - 360, e.clientX - dragOffset.x))
      const newY = Math.max(0, Math.min(window.innerHeight - 130, e.clientY - dragOffset.y))

      setPosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, dragOffset])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  if (!currentTrack) return null

  return (
    <div
      className="fixed z-50 bg-black/80 backdrop-blur-2xl border border-white/[0.07] rounded-xl shadow-2xl overflow-hidden"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: "360px",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--primary)/0.1)] to-transparent pointer-events-none" />
      <div className="flex items-center gap-3 p-4 cursor-move relative z-10" onMouseDown={handleMouseDown}>
        {currentTrack.thumbnail ? (
          <Image
            src={currentTrack.thumbnail || "/placeholder.svg"}
            width={56}
            height={56}
            alt={currentTrack.title}
            className="w-14 h-14 rounded object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-14 bg-secondary rounded flex items-center justify-center flex-shrink-0">
            <span className="text-2xl text-muted-foreground">♪</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm line-clamp-1 text-white">{currentTrack.title}</p>
          <p className="text-xs text-gray-400 line-clamp-1">{currentTrack.artist}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button size="icon" variant="ghost" onClick={onPrevious} className="h-8 w-8 text-white/60 hover:text-white hover:bg-primary/15 transition-colors">
            <SkipBack size={16} />
          </Button>

          <Button
            size="icon"
            onClick={onPlayPause}
            className="bg-white text-black rounded-full h-10 w-10 hover:scale-105 hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/20 ring-2 ring-primary/20"
          >
            {isPlaying ? <Pause fill="currentColor" size={18} /> : <Play fill="currentColor" size={18} className="ml-0.5" />}
          </Button>

          <Button size="icon" variant="ghost" onClick={onNext} className="h-8 w-8 text-white/60 hover:text-white hover:bg-primary/15 transition-colors">
            <SkipForward size={16} />
          </Button>

          <Button size="icon" variant="ghost" onClick={onExpand} className="h-8 w-8 text-white/60 hover:text-white hover:bg-primary/15 transition-colors">
            <Maximize2 size={16} />
          </Button>

          <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8 text-white/60 hover:text-white hover:bg-primary/15 transition-colors">
            <X size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
