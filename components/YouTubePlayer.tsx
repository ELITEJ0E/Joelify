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

  // ── Stable callback refs (prevents stale closure on repeat/shuffle) ────────
  const onStateChangeRef = useRef(onStateChange)
  const onErrorRef = useRef(onError)
  const onPlayerReadyRef = useRef(onPlayerReady)
  const onDurationReadyRef = useRef(onDurationReady)
  const onTimeUpdateRef = useRef(onTimeUpdate)

  useEffect(() => { onStateChangeRef.current = onStateChange }, [onStateChange])
  useEffect(() => { onErrorRef.current = onError }, [onError])
  useEffect(() => { onPlayerReadyRef.current = onPlayerReady }, [onPlayerReady])
  useEffect(() => { onDurationReadyRef.current = onDurationReady }, [onDurationReady])
  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate }, [onTimeUpdate])
  // ─────────────────────────────────────────────────────────────────────────

  const startDurationPolling = (player: any) => {
    if (durationPollIntervalRef.current) {
      clearInterval(durationPollIntervalRef.current)
      durationPollIntervalRef.current = null
    }

    let attempts = 0
    const maxAttempts = 20

    durationPollIntervalRef.current = setInterval(() => {
      attempts++
      if (player && typeof player.getDuration === "function") {
        const duration = player.getDuration()
        if (duration > 0 && !isNaN(duration)) {
          if (onDurationReadyRef.current) onDurationReadyRef.current(duration)
          if (durationPollIntervalRef.current) {
            clearInterval(durationPollIntervalRef.current)
            durationPollIntervalRef.current = null
          }
          if (player.getPlayerState?.() === 1) startProgressTracking(player)
        } else if (attempts >= maxAttempts) {
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

    const updateProgress = () => {
      if (player && typeof player.getCurrentTime === "function" && typeof player.getDuration === "function") {
        try {
          const playerState = player.getPlayerState?.()
          if (playerState === 1 || playerState === 3) {
            const currentTime = player.getCurrentTime()
            const duration = player.getDuration()
            if (duration > 0 && !isNaN(duration) && !isNaN(currentTime)) {
              if (onTimeUpdateRef.current) onTimeUpdateRef.current(currentTime, duration)
            }
            progressRAFRef.current = requestAnimationFrame(updateProgress)
          } else {
            progressRAFRef.current = null
          }
        } catch {
          progressRAFRef.current = null
        }
      }
    }

    progressRAFRef.current = requestAnimationFrame(updateProgress)
  }

  const stopProgressTracking = () => {
    if (progressRAFRef.current) {
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
              startDurationPolling(event.target)
              onPlayerReadyRef.current(event.target)
            },
            onStateChange: (event: any) => {
              const playerState = event.data
              if (playerState === 1) {
                if (!durationPollIntervalRef.current) startDurationPolling(event.target)
                startProgressTracking(event.target)
              } else if (playerState === 3) {
                if (!durationPollIntervalRef.current) startDurationPolling(event.target)
              } else if (playerState === 2 || playerState === 0) {
                stopProgressTracking()
              }
              onStateChangeRef.current(event)
            },
            onError: (event: any) => {
              console.error("[YouTube] Error:", event.data)
              if (durationPollIntervalRef.current) {
                clearInterval(durationPollIntervalRef.current)
                durationPollIntervalRef.current = null
              }
              stopProgressTracking()
              onErrorRef.current(event)
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
  }, [audioSettings]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (playerRef.current && isPlayerReadyRef.current && currentTrack?.id) {
      if (durationPollIntervalRef.current) {
        clearInterval(durationPollIntervalRef.current)
        durationPollIntervalRef.current = null
      }
      stopProgressTracking()
      playerRef.current.loadVideoById({ videoId: currentTrack.id, startSeconds: 0 })
      setTimeout(() => startDurationPolling(playerRef.current), 500)
    }
  }, [currentTrack?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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
    return () => window.removeEventListener("resize", updatePlayerSize)
  }, [videoMode])

  return (
    /**
     * STABLE ROOT — id="yt-player-root" is used by ExpandablePlayer to locate
     * and re-parent the inner container (containerRef) into the expanded view
     * thumbnail slot when video mode is active.  The inner div is the actual
     * YT-managed element; moving it in the DOM does NOT break the IFrame API.
     */
    <div id="yt-player-root">
      <div
        ref={containerRef}
        className={`${
          videoMode
            ? "flex justify-center items-center bg-black p-2 w-full"
            : "hidden"
        } relative overflow-hidden`}
        style={{ maxWidth: "640px", maxHeight: "360px", margin: "0 auto" }}
      >
        <div id="youtube-player" className="w-full h-full" style={{ aspectRatio: "16/9" }}></div>
      </div>
    </div>
  )
}
