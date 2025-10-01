"use client"

import { useEffect, useRef } from "react"
import { useApp } from "@/contexts/AppContext"

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

interface YouTubePlayerProps {
  onPlayerReady: (player: any) => void
  onStateChange: (event: any) => void
}

export function YouTubePlayer({ onPlayerReady, onStateChange }: YouTubePlayerProps) {
  const playerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isPlayerReadyRef = useRef(false)
  const { currentTrack } = useApp()

  useEffect(() => {
    // Initialize YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement("script")
      tag.src = "https://www.youtube.com/iframe_api"
      const firstScriptTag = document.getElementsByTagName("script")[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }

    const initPlayer = () => {
      if (window.YT && window.YT.Player && containerRef.current && !playerRef.current) {
        playerRef.current = new window.YT.Player("youtube-player", {
          height: "0",
          width: "0",
          videoId: "",
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: (event: any) => {
              console.log("[v0] YouTube player ready")
              isPlayerReadyRef.current = true
              onPlayerReady(event.target)
            },
            onStateChange: onStateChange,
          },
        })
      }
    }

    if (window.YT && window.YT.Player) {
      initPlayer()
    } else {
      window.onYouTubeIframeAPIReady = initPlayer
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy()
        playerRef.current = null
        isPlayerReadyRef.current = false
      }
    }
  }, []) // Only initialize once, not on currentTrack change

  useEffect(() => {
    if (playerRef.current && isPlayerReadyRef.current && currentTrack) {
      // Check if loadVideoById exists before calling
      if (typeof playerRef.current.loadVideoById === "function") {
        console.log("[v0] Loading video:", currentTrack.id)
        playerRef.current.loadVideoById(currentTrack.id)
      }
    }
  }, [currentTrack])

  return (
    <div ref={containerRef} className="hidden">
      <div id="youtube-player"></div>
    </div>
  )
}
