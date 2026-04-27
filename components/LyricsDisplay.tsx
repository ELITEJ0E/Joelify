"use client"

import { useState, useEffect, useRef } from "react"
import { Music2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useApp } from "@/contexts/AppContext"
import { useLyrics } from "@/hooks/useLyrics"

interface LyricsDisplayProps {
  currentTime: number
  isPlaying: boolean
}

export function LyricsDisplay({ currentTime, isPlaying }: LyricsDisplayProps) {
  const { currentTrack } = useApp()
  const { lyrics, isLoading, error } = useLyrics(currentTrack?.title, currentTrack?.artist)
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (!lyrics || lyrics.length === 0) return

    const newIndex = lyrics.findIndex((line, index) => {
      const nextLine = lyrics[index + 1]
      return currentTime >= line.time && (!nextLine || currentTime < nextLine.time)
    })

    if (newIndex !== -1 && newIndex !== currentLineIndex) {
      setCurrentLineIndex(newIndex)
    }
  }, [currentTime, lyrics, currentLineIndex])

  useEffect(() => {
    if (lineRefs.current[currentLineIndex] && scrollRef.current) {
      lineRefs.current[currentLineIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }
  }, [currentLineIndex])

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <Music2 size={48} className="mb-4 opacity-50" />
        <p className="text-sm">No track playing</p>
        <p className="text-xs mt-1">Play a song to see lyrics</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
        <p className="text-sm">Loading lyrics...</p>
      </div>
    )
  }

  if (error || !lyrics || lyrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <Music2 size={48} className="mb-4 opacity-50" />
        <p className="text-sm">{error || "No lyrics available"}</p>
        <p className="text-xs mt-1">for {currentTrack.title}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full">
      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        <div className="space-y-4 pb-32">
          {lyrics.map((line, index) => (
            <div
              key={index}
              ref={(el) => (lineRefs.current[index] = el)}
              className={`transition-all duration-300 ${
                index === currentLineIndex
                  ? "text-foreground text-2xl font-bold scale-105"
                  : index < currentLineIndex
                    ? "text-muted-foreground text-lg opacity-50"
                    : "text-muted-foreground text-lg opacity-30"
              }`}
            >
              {line.text || "\u00A0"}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
