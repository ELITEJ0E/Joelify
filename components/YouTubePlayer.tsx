// components/YouTubePlayer.tsx
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
  onDurationReady?: (duration: number) => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
}

export function YouTubePlayer({
  onPlayerReady,
  onStateChange,
  onError,
  onDurationReady,
  onTimeUpdate,
}: YouTubePlayerProps) {
  const playerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isPlayerReadyRef = useRef(false)
  const durationPollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const progressRAFRef = useRef<number | null>(null)
  const { currentTrack, videoMode, audioSettings } = useApp()

  const startDurationPolling = (player: any) => {
    if (durationPollIntervalRef.current) {
      clearInterval(durationPollIntervalRef.current)
      durationPollIntervalRef.current = null
    }

    console.log("[SyncFix] Starting duration polling")
    let attempts = 0
    const maxAttempts = 20 // 20 attempts * 300ms = 6 seconds max

    durationPollIntervalRef.current = setInterval(() => {
      attempts++

      if (player && typeof player.getDuration === "function") {
        const duration = player.getDuration()
        console.log("[SyncFix] Polling duration (attempt", attempts, "):", duration)

        if (duration > 0 && !isNaN(duration)) {
          console.log("[SyncFix] Valid duration detected:", duration)

          // Call the callback to notify PlayerControls
          if (onDurationReady) {
            onDurationReady(duration)
          }

          // Stop polling once we have valid duration
          if (durationPollIntervalRef.current) {
            clearInterval(durationPollIntervalRef.current)
            durationPollIntervalRef.current = null
          }

          // Start progress tracking if playing
          if (player.getPlayerState?.() === 1) {
            startProgressTracking(player)
          }
        } else if (attempts >= maxAttempts) {
          console.log("[SyncFix] Max polling attempts reached, stopping")
          if (durationPollIntervalRef.current) {
            clearInterval(durationPollIntervalRef.current)
            durationPollIntervalRef.current = null
          }
        }
      }
    }, 300)
  }

  const startProgressTracking = (player: any) => {
    if (progressRAFRef.current) {
      cancelAnimationFrame(progressRAFRef.current)
      progressRAFRef.current = null
    }

    console.log("[SyncFix] Starting progress tracking RAF")

    const updateProgress = () => {
      if (player && typeof player.getCurrentTime === "function" && typeof player.getDuration === "function") {
        try {
          const playerState = player.getPlayerState?.()

          // Only track when playing or buffering
          if (playerState === 1 || playerState === 3) {
            const currentTime = player.getCurrentTime()
            const duration = player.getDuration()

            if (duration > 0 && !isNaN(duration) && !isNaN(currentTime)) {
              if (onTimeUpdate) {
                onTimeUpdate(currentTime, duration)
              }
            }

            progressRAFRef.current = requestAnimationFrame(updateProgress)
          } else {
            // Stop tracking if not playing
            console.log("[SyncFix] Stopping progress tracking - state:", playerState)
            progressRAFRef.current = null
          }
        } catch (error) {
          console.error("[SyncFix] Error in progress tracking:", error)
          progressRAFRef.current = null
        }
      }
    }

    progressRAFRef.current = requestAnimationFrame(updateProgress)
  }

  const stopProgressTracking = () => {
    if (progressRAFRef.current) {
      console.log("[SyncFix] Stopping progress tracking RAF")
      cancelAnimationFrame(progressRAFRef.current)
      progressRAFRef.current = null
    }
  }

  useEffect(() => {
    const loadYouTubeAPI = () => {
      if (!window.YT) {
        const tag = document.createElement("script")
        tag.src = "https://www.youtube.com/iframe_api"
        const firstScriptTag = document.getElementsByTagName("script")[0]
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
      }
    }

    const initPlayer = () => {
      if (window.YT && window.YT.Player && containerRef.current && !playerRef.current) {
        const playerVars: any = {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          iv_load_policy: 3,
        }

        // Apply quality setting if not audio-only
        if (audioSettings.youtubeQuality !== "audio") {
          playerVars.quality = audioSettings.youtubeQuality
        }

        playerRef.current = new window.YT.Player("youtube-player", {
          height: "100%",
          width: "100%",
          videoId: currentTrack?.id || "",
          playerVars,
          events: {
            onReady: (event: any) => {
              isPlayerReadyRef.current = true
              event.target.setVolume(100)

              if (audioSettings.youtubeQuality !== "audio") {
                event.target.setPlaybackQuality(audioSettings.youtubeQuality)
              }

              startDurationPolling(event.target)
              onPlayerReady(event.target)
            },
            onStateChange: (event: any) => {
              const playerState = event.data

              if (playerState === 1) {
                if (audioSettings.youtubeQuality !== "audio") {
                  event.target.setPlaybackQuality(audioSettings.youtubeQuality)
                }

                if (!durationPollIntervalRef.current) {
                  startDurationPolling(event.target)
                }
                startProgressTracking(event.target)
              } else if (playerState === 3) {
                if (!durationPollIntervalRef.current) {
                  startDurationPolling(event.target)
                }
              } else if (playerState === 2 || playerState === 0) {
                stopProgressTracking()
              }
              onStateChange(event)
            },
            onError: (event: any) => {
              console.error("[YouTube] Error:", event.data)
              if (durationPollIntervalRef.current) {
                clearInterval(durationPollIntervalRef.current)
                durationPollIntervalRef.current = null
              }
              stopProgressTracking()
              onError(event)
            },
          },
        })
      }
    }

    loadYouTubeAPI()
    if (window.YT && window.YT.Player) {
      initPlayer()
    } else {
      window.onYouTubeIframeAPIReady = initPlayer
    }

    return () => {
      if (durationPollIntervalRef.current) {
        clearInterval(durationPollIntervalRef.current)
        durationPollIntervalRef.current = null
      }
      stopProgressTracking()
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        playerRef.current.destroy()
        playerRef.current = null
        isPlayerReadyRef.current = false
      }
      window.onYouTubeIframeAPIReady = () => {}
    }
  }, [audioSettings])

  useEffect(() => {
    if (playerRef.current && isPlayerReadyRef.current && currentTrack?.id) {
      console.log("[SyncFix] Loading new video:", currentTrack.id)
      // Stop any existing polling/tracking
      if (durationPollIntervalRef.current) {
        clearInterval(durationPollIntervalRef.current)
        durationPollIntervalRef.current = null
      }
      stopProgressTracking()
      // Load the new video
      playerRef.current.loadVideoById({
        videoId: currentTrack.id,
        startSeconds: 0,
      })
      // Start duration polling after a small delay
      setTimeout(() => {
        startDurationPolling(playerRef.current)
      }, 500)
    }
  }, [currentTrack?.id])

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
      <div id="youtube-player" className="w-full h-full" style={{ aspectRatio: "16/9" }}></div>
    </div>
  )
}
