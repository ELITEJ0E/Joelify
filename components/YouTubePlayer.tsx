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
  /** When true, renders the iframe visibly in the bar. Same single player instance — no second iframe created. */
  videoMode?: boolean
  isPlaying?: boolean
  onCloseVideo?: () => void
}

function isValidYouTubeId(id: string | undefined | null): boolean {
  if (!id) return false
  return /^[a-zA-Z0-9_-]{11}$/.test(id)
}

export function YouTubePlayer(props: YouTubePlayerProps) {
  return <YouTubeIframePlayer {...props} />
}

function YouTubeIframePlayer({
  onPlayerReady,
  onStateChange,
  onError,
  onDurationReady,
  onTimeUpdate,
  videoMode = false,
  isPlaying = false,
  onCloseVideo,
}: YouTubePlayerProps) {
  const playerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isPlayerReadyRef = useRef(false)
  const durationPollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const progressRAFRef = useRef<number | null>(null)
  const { currentTrack, audioSettings, playbackSource } = useApp()
  
  const isPlayingRef = useRef(isPlaying)
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  // ── Stable callback refs ───────────────────────────────────────────────────
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

  const startDurationPolling = (player: any) => {
    if (durationPollIntervalRef.current) {
      clearInterval(durationPollIntervalRef.current)
      durationPollIntervalRef.current = null
    }
    let attempts = 0
    durationPollIntervalRef.current = setInterval(() => {
      attempts++
      if (player && typeof player.getDuration === "function") {
        try {
          const duration = player.getDuration()
          if (duration > 0 && !isNaN(duration)) {
            onDurationReadyRef.current?.(duration)
            clearInterval(durationPollIntervalRef.current!)
            durationPollIntervalRef.current = null
            if (player.getPlayerState?.() === 1) startProgressTracking(player)
          } else if (attempts >= 30) {
            clearInterval(durationPollIntervalRef.current!)
            durationPollIntervalRef.current = null
          }
        } catch {
          // ignore transient errors during init
        }
      }
    }, 250)
  }

  const startProgressTracking = (player: any) => {
    if (progressRAFRef.current) {
      cancelAnimationFrame(progressRAFRef.current)
      progressRAFRef.current = null
    }
    const update = () => {
      try {
        const state = player?.getPlayerState?.()
        if (state === 1 || state === 3) {
          const ct = player.getCurrentTime?.() ?? 0
          const d = player.getDuration?.() ?? 0
          if (d > 0 && !isNaN(d) && !isNaN(ct)) onTimeUpdateRef.current?.(ct, d)
          progressRAFRef.current = requestAnimationFrame(update)
        } else {
          progressRAFRef.current = null
        }
      } catch {
        progressRAFRef.current = null
      }
    }
    progressRAFRef.current = requestAnimationFrame(update)
  }

  const stopProgressTracking = () => {
    if (progressRAFRef.current) {
      cancelAnimationFrame(progressRAFRef.current)
      progressRAFRef.current = null
    }
  }

  // Helper to safely initialize YouTube Player
  const initPlayer = () => {
    if (!window.YT?.Player || !containerRef.current || playerRef.current || playbackSource !== "youtube") return
    if (!currentTrack?.id || !isValidYouTubeId(currentTrack.id)) return

    try {
      const playerVars: any = {
        autoplay: isPlayingRef.current ? 1 : 0,
        controls: 1,
        disablekb: 0,
        fs: 1,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        iv_load_policy: 3,
        origin: typeof window !== "undefined" ? window.location.origin : undefined,
      }
      if (audioSettings.youtubeQuality !== "audio") {
        playerVars.quality = audioSettings.youtubeQuality
      }

      // Create a fresh target element inside containerRef to prevent DOM detachment bugs
      containerRef.current.innerHTML = ""
      const targetDiv = document.createElement("div")
      targetDiv.style.width = "100%"
      targetDiv.style.height = "100%"
      targetDiv.style.aspectRatio = "16/9"
      containerRef.current.appendChild(targetDiv)

      playerRef.current = new window.YT.Player(targetDiv, {
        height: "100%",
        width: "100%",
        videoId: currentTrack.id,
        playerVars,
        events: {
          onReady: (event: any) => {
            isPlayerReadyRef.current = true
            try {
              // Ensure iframe attributes allow native fullscreen
              const iframe = containerRef.current?.querySelector("iframe")
              if (iframe) {
                iframe.setAttribute("allowfullscreen", "1")
                iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen")
              }
            } catch (e) {
              console.warn("Error setting fullscreen attributes:", e)
            }
            try {
              event.target.setVolume(100)
              if (isValidYouTubeId(currentTrack?.id) && playbackSource === "youtube") {
                if (isPlayingRef.current) {
                  event.target.loadVideoById(currentTrack.id)
                  setTimeout(() => {
                    try {
                      if (event.target.getPlayerState?.() !== 1) {
                        event.target.playVideo?.()
                      }
                    } catch (e) { console.warn(e) }
                  }, 100)
                } else {
                  event.target.cueVideoById(currentTrack.id)
                }
              }
              startDurationPolling(event.target)
              onPlayerReadyRef.current(event.target)
            } catch (err) {
              console.warn("[YouTube] onReady handler warning:", err)
              onPlayerReadyRef.current(event.target)
            }
          },
          onStateChange: (event: any) => {
            const s = event.data
            if (s === 1) {
              if (!durationPollIntervalRef.current) startDurationPolling(event.target)
              startProgressTracking(event.target)
            } else if (s === 3) {
              if (!durationPollIntervalRef.current) startDurationPolling(event.target)
            } else if (s === 2 || s === 0) {
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
    } catch (e) {
      console.warn("[YouTube] Error constructing YT.Player:", e)
    }
  }

  // Load YouTube Iframe API Script & initialize
  useEffect(() => {
    if (playbackSource !== "youtube" || !isValidYouTubeId(currentTrack?.id)) return

    // If script is not yet present, insert it
    if (!window.YT) {
      const existingTag = document.querySelector('script[src*="youtube.com/iframe_api"]')
      if (!existingTag) {
        const tag = document.createElement("script")
        tag.src = "https://www.youtube.com/iframe_api"
        tag.async = true
        document.head.appendChild(tag)
      }
    }

    // Check if YT.Player is already ready
    if (window.YT?.Player) {
      if (!playerRef.current) {
        initPlayer()
      }
    } else {
      // Setup both callback and interval check to guarantee initialization
      const prevCallback = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prevCallback?.()
        initPlayer()
      }

      const pollYT = setInterval(() => {
        if (window.YT?.Player) {
          clearInterval(pollYT)
          if (!playerRef.current) {
            initPlayer()
          }
        }
      }, 80)

      return () => clearInterval(pollYT)
    }
  }, [currentTrack?.id, playbackSource, audioSettings.youtubeQuality]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationPollIntervalRef.current) {
        clearInterval(durationPollIntervalRef.current)
        durationPollIntervalRef.current = null
      }
      stopProgressTracking()
      if (playerRef.current) {
        try {
          playerRef.current.destroy?.()
        } catch {}
        playerRef.current = null
      }
      isPlayerReadyRef.current = false
    }
  }, [])

  // Handle quality settings change
  useEffect(() => {
    if (playerRef.current) {
      if (durationPollIntervalRef.current) {
        clearInterval(durationPollIntervalRef.current)
        durationPollIntervalRef.current = null
      }
      stopProgressTracking()
      try {
        playerRef.current.destroy?.()
      } catch {}
      playerRef.current = null
      isPlayerReadyRef.current = false
      initPlayer()
    }
  }, [audioSettings.youtubeQuality]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle track change when player is already instantiated
  useEffect(() => {
    if (playerRef.current && isPlayerReadyRef.current && isValidYouTubeId(currentTrack?.id) && playbackSource === "youtube") {
      try {
        const currentId = playerRef.current.getVideoData?.()?.video_id
        if (currentId === currentTrack!.id) return

        if (durationPollIntervalRef.current) {
          clearInterval(durationPollIntervalRef.current)
          durationPollIntervalRef.current = null
        }
        stopProgressTracking()

        if (isPlayingRef.current) {
          playerRef.current.loadVideoById(currentTrack!.id)
          setTimeout(() => {
            try {
              if (playerRef.current?.getPlayerState?.() !== 1) {
                playerRef.current?.playVideo?.()
              }
            } catch {}
          }, 100)
        } else {
          playerRef.current.cueVideoById(currentTrack!.id)
        }

        setTimeout(() => startDurationPolling(playerRef.current), 300)
      } catch (e) {
        console.warn("[YouTube] Track switch error:", e)
      }
    }
  }, [currentTrack?.id, playbackSource])

  // Handle play/pause synchronization
  useEffect(() => {
    if (playerRef.current && isPlayerReadyRef.current && playbackSource === "youtube") {
      try {
        const state = playerRef.current.getPlayerState?.()
        if (isPlaying) {
          if (state === 5 || state === -1 || state === undefined) {
            if (currentTrack?.id) {
              playerRef.current.loadVideoById(currentTrack.id)
            }
          }
          if (state !== 1) {
            playerRef.current.playVideo?.()
          }
        } else {
          if (state !== 2 && state !== 0 && state !== -1 && state !== 5) {
            playerRef.current.pauseVideo?.()
          }
        }
      } catch (err) {
        console.warn("YouTubePlayer play/pause sync error:", err)
      }
    }
  }, [isPlaying, playbackSource, currentTrack?.id])

  return (
    <div
      className={
        videoMode
          ? "absolute bottom-[116px] lg:bottom-[76px] left-0 right-0 mx-auto w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-5xl aspect-video max-h-[calc(100vh-140px)] bg-black rounded-xl md:rounded-2xl overflow-hidden shadow-2xl border border-white/15 z-30 pointer-events-auto opacity-100 scale-100 flex items-center justify-center transition-all duration-300 ease-in-out"
          : "absolute bottom-0 left-0 w-[320px] h-[180px] bg-black rounded-xl md:rounded-2xl overflow-hidden shadow-none border border-transparent -z-50 pointer-events-none opacity-[0.001] scale-95 flex items-center justify-center transition-all duration-300 ease-in-out"
      }
    >
      <div ref={containerRef} className="w-full h-full flex items-center justify-center" style={{ width: "100%", height: "100%", aspectRatio: "16/9" }} />
    </div>
  )
}

