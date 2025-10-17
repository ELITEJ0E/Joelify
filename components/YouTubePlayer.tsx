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
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1, // Important for iOS
            rel: 0,
            iv_load_policy: 3,
            // Enable background playback on mobile
            origin: window.location.origin,
            widget_referrer: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              console.log("[YouTubePlayer] Player ready")
              isPlayerReadyRef.current = true
              
              // Enable background playback features
              const iframe = event.target.getIframe()
              if (iframe) {
                iframe.setAttribute('playsinline', '1')
                iframe.setAttribute('webkit-playsinline', '1')
                iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture')
              }
              
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

  // Load video when track changes
  useEffect(() => {
    if (playerRef.current && isPlayerReadyRef.current && currentTrack?.id) {
      console.log("[YouTubePlayer] Loading video:", currentTrack.id)
      
      // Small delay to ensure player is ready
      setTimeout(() => {
        playerRef.current.loadVideoById({
          videoId: currentTrack.id,
          startSeconds: 0,
        })
      }, 100)
    }
  }, [currentTrack?.id])

  // Handle responsive sizing
  useEffect(() => {
    const updatePlayerSize = () => {
      if (containerRef.current && videoMode) {
        const container = containerRef.current
        const maxWidth = 640
        const maxHeight = 360
        const aspectRatio = 16 / 9
        const containerWidth = container.parentElement?.clientWidth || window.innerWidth
        const width = Math.min(containerWidth * 0.9, maxWidth)
        const height = Math.min(width / aspectRatio, maxHeight)
        container.style.width = `${width}px`
        container.style.height = `${height}px`
      } else if (containerRef.current) {
        containerRef.current.style.height = "0px"
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
        videoMode ? "flex justify-center items-center bg-black p-2 w-full" : "hidden"
      } relative overflow-hidden`}
      style={{ maxWidth: "640px", maxHeight: "360px", margin: "0 auto" }}
    >
      <div
        id="youtube-player"
        className="w-full h-full"
        style={{ aspectRatio: "16/9" }}
      ></div>
    </div>
  )
}
