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
  onError: (event: any) => void
}

export function YouTubePlayer({ onPlayerReady, onStateChange, onError }: YouTubePlayerProps) {
  const playerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isPlayerReadyRef = useRef(false)
  const { currentTrack, videoMode } = useApp()

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
          height: "360",
          width: "640",
          videoId: "",
          playerVars: {
            autoplay: 0,
            controls: 1,
            disablekb: 0,
            fs: 1,
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
            onError: onError,
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
  }, [])

  useEffect(() => {
    if (playerRef.current && isPlayerReadyRef.current && currentTrack) {
      if (typeof playerRef.current.loadVideoById === "function") {
        console.log("[v0] Loading video:", currentTrack.id)
        playerRef.current.loadVideoById(currentTrack.id)
      }
    }
  }, [currentTrack])

  return (
    <div ref={containerRef} className={`${videoMode ? "flex justify-center items-center bg-black p-4" : "hidden"}`}>
      <div id="youtube-player" className={`${videoMode ? "w-full max-w-4xl aspect-video" : ""}`}></div>
    </div>
  )
}
