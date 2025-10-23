"use client"

import { useApp } from "@/contexts/AppContext"
import { Button } from "@/components/ui/button"
import { Youtube, Music2 } from "lucide-react"
import { isAuthenticated } from "@/lib/spotifyAuth"
import { useEffect, useState } from "react"

export function PlaybackSourceSwitch() {
  const { playbackSource, setPlaybackSource } = useApp()
  const [isSpotifyAuth, setIsSpotifyAuth] = useState(false)

  useEffect(() => {
    setIsSpotifyAuth(isAuthenticated())
  }, [])

  const handleSwitch = (source: "youtube" | "spotify") => {
    if (source === "spotify" && !isSpotifyAuth) {
      alert("Please login to Spotify first")
      return
    }

    console.log(`[Player] Switching playback source to: ${source}`)
    setPlaybackSource(source)
  }

  return (
    <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-1">
      <Button
        size="sm"
        variant={playbackSource === "youtube" ? "default" : "ghost"}
        onClick={() => handleSwitch("youtube")}
        className="gap-2"
      >
        <Youtube className="h-4 w-4" />
        YouTube
      </Button>
      <Button
        size="sm"
        variant={playbackSource === "spotify" ? "default" : "ghost"}
        onClick={() => handleSwitch("spotify")}
        className="gap-2"
        disabled={!isSpotifyAuth}
      >
        <Music2 className="h-4 w-4" />
        Spotify
      </Button>
    </div>
  )
}
