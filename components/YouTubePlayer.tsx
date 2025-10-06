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
    // Load YouTube IFrame API
    const loadYouTubeAPI = () => {
      if (!window.YT) {
        const tag = document.createElement("script")
        tag.src = "https://www.youtube.com/iframe_api"
        const firstScriptTag = document.getElementsByTagName("script")[0]
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
      }
    }

    // Initialize YouTube player
    const initPlayer = () => {
      if (window.YT && window.YT.Player && containerRef.current && !playerRef.current) {
        playerRef.current = new window.YT.Player("youtube-player", {
          height: "100%",
          width: "100%",
          videoId: currentTrack?.id || "",
          playerVars: {
            autoplay: 0,
            controls: 0, // Hide default YouTube controls
            disablekb: 1, // Disable keyboard controls
            fs: 0, // Disable fullscreen button
            modestbranding: 1,
            playsinline: 1,
            rel: 0, // Prevent related videos
            iv_load_policy: 3, // Disable annotations
          },
          events: {
            onReady: (event: any) => {
              console.log("[YouTubePlayer] Player ready")
              isPlayerReadyRef.current = true
              onPlayerReady(event.target)
            },
            onStateChange: onStateChange,
            onError: (event: any) => {
              console.error("[YouTubePlayer] Error:", event.data)
              onError(event)
            },
          },
        })
      }
    }

    // Initialize API and player
    loadYouTubeAPI()
    if (window.YT && window.YT.Player) {
      initPlayer()
    } else {
      window.onYouTubeIframeAPIReady = initPlayer
    }

    // Cleanup on unmount
    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        console.log("[YouTubePlayer] Destroying player")
        playerRef.current.destroy()
        playerRef.current = null
        isPlayerReadyRef.current = false
      }
      window.onYouTubeIframeAPIReady = () => {}
    }
  }, [])

  // Load video and restore playback position
  useEffect(() => {
    if (playerRef.current && isPlayerReadyRef.current && currentTrack?.id) {
      console.log("[YouTubePlayer] Loading video:", currentTrack.id)
      playerRef.current.loadVideoById({
        videoId: currentTrack.id,
        startSeconds: 0,
      })
    }
  }, [currentTrack?.id])

  // Handle responsive sizing
  useEffect(() => {
    const updatePlayerSize = () => {
      if (containerRef.current && videoMode) {
        const container = containerRef.current
        const maxWidth = 854 // Max width for 480p
        const aspectRatio = 16 / 9
        const containerWidth = container.clientWidth
        const width = Math.min(containerWidth, maxWidth)
        const height = width / aspectRatio
        container.style.height = `${height}px`
      }
    }

    updatePlayerSize()
    window.addEventListener("resize", updatePlayerSize)

    return () => {
      window.removeEventListener("resize", updatePlayerSize)
    }
  }, [videoMode])

  return (
    <div
      ref={containerRef}
      className={`${
        videoMode ? "flex justify-center items-center bg-black p-4 w-full" : "hidden"
      }`}
      style={{ maxWidth: "854px", margin: "0 auto" }}
    >
      <div
        id="youtube-player"
        className="w-full"
        style={{ aspectRatio: "16/9" }}
      ></div>
    </div>
  )
}
