"use client"

import { useState, useEffect, useRef } from "react"
import { Music2, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useApp } from "@/contexts/AppContext"

interface LyricLine {
  time: number
  text: string
}

interface LyricsDisplayProps {
  currentTime: number
  isPlaying: boolean
}

export function LyricsDisplay({ currentTime, isPlaying }: LyricsDisplayProps) {
  const { currentTrack } = useApp()
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (!currentTrack) {
      setLyrics([])
      setError(null)
      return
    }

    const fetchLyrics = async () => {
      setIsLoading(true)
      setError(null)

      try {
        console.log("[Lyrics] Fetching lyrics for:", currentTrack.title, currentTrack.artist)

        // Mock lyrics for demonstration - in production, integrate with Genius API or Musixmatch
        const mockLyrics: LyricLine[] = [
          { time: 0, text: `${currentTrack.title}` },
          { time: 2, text: `by ${currentTrack.artist}` },
          { time: 5, text: "" },
          { time: 10, text: "Verse 1:" },
          { time: 12, text: "In the stillness of the night" },
          { time: 16, text: "When the stars are shining bright" },
          { time: 20, text: "I hear your voice calling out to me" },
          { time: 24, text: "Like a melody so sweet" },
          { time: 28, text: "" },
          { time: 30, text: "Chorus:" },
          { time: 32, text: "We're dancing through the moonlight" },
          { time: 36, text: "Everything feels so right" },
          { time: 40, text: "With you here by my side" },
          { time: 44, text: "We'll make it through the night" },
          { time: 48, text: "" },
          { time: 50, text: "Verse 2:" },
          { time: 52, text: "Every moment that we share" },
          { time: 56, text: "Takes away all of my cares" },
          { time: 60, text: "Your love is like a guiding light" },
          { time: 64, text: "Leading me through the darkest night" },
          { time: 68, text: "" },
          { time: 70, text: "Chorus:" },
          { time: 72, text: "We're dancing through the moonlight" },
          { time: 76, text: "Everything feels so right" },
          { time: 80, text: "With you here by my side" },
          { time: 84, text: "We'll make it through the night" },
          { time: 88, text: "" },
          { time: 90, text: "Bridge:" },
          { time: 92, text: "Hold on tight, don't let go" },
          { time: 96, text: "This love will only grow" },
          { time: 100, text: "Together we'll find our way" },
          { time: 104, text: "Forever and a day" },
          { time: 108, text: "" },
          { time: 110, text: "Final Chorus:" },
          { time: 112, text: "We're dancing through the moonlight" },
          { time: 116, text: "Everything feels so right" },
          { time: 120, text: "With you here by my side" },
          { time: 124, text: "We'll make it through the night" },
          { time: 128, text: "" },
          { time: 130, text: "Outro:" },
          { time: 132, text: "Through the night..." },
          { time: 136, text: "We'll make it through the night..." },
        ]

        setLyrics(mockLyrics)
        setIsLoading(false)
      } catch (err) {
        console.error("[Lyrics] Error fetching lyrics:", err)
        setError("Lyrics not available for this track")
        setIsLoading(false)
      }
    }

    fetchLyrics()
  }, [currentTrack])

  useEffect(() => {
    if (!isPlaying || lyrics.length === 0) return

    const newIndex = lyrics.findIndex((line, index) => {
      const nextLine = lyrics[index + 1]
      return currentTime >= line.time && (!nextLine || currentTime < nextLine.time)
    })

    if (newIndex !== -1 && newIndex !== currentLineIndex) {
      setCurrentLineIndex(newIndex)
    }
  }, [currentTime, isPlaying, lyrics, currentLineIndex])

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

  if (error || lyrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <Music2 size={48} className="mb-4 opacity-50" />
        <p className="text-sm">{error || "No lyrics available"}</p>
        <p className="text-xs mt-1">for {currentTrack.title}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Music2 size={20} className="text-primary" />
          <h3 className="font-semibold text-sm">Lyrics</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </Button>
      </div>

      {isExpanded && (
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="space-y-4">
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
      )}
    </div>
  )
}
