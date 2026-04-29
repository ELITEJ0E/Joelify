"use client"

import { useEffect, useRef } from "react"
import { useApp } from "@/contexts/AppContext"
import { AudioEngine } from "./AudioEngine"

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
}: YouTubePlayerProps) {
  const playerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isPlayerReadyRef = useRef(false)
  const durationPollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const progressRAFRef = useRef<number | null>(null)
  const { currentTrack, audioSettings, playbackSource } = useApp()
  // Note: we don't strictly need isPlaying in the dependency array of the load effect
  // but we should check its current value when deciding whether to load or cue.
  // Using a ref to track isPlaying state to avoid unnecessary re-renders of the effect.
  const isPlayingRef = useRef(false)
  
  // We need to pass isPlaying to the component or consume it differently
  // To avoid circular dependencies or too many re-renders, let's just use the current playing state
  // actually, PlayerControls manages isPlaying.

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
        const duration = player.getDuration()
        if (duration > 0 && !isNaN(duration)) {
          onDurationReadyRef.current?.(duration)
          clearInterval(durationPollIntervalRef.current!)
          durationPollIntervalRef.current = null
          if (player.getPlayerState?.() === 1) startProgressTracking(player)
        } else if (attempts >= 20) {
          clearInterval(durationPollIntervalRef.current!)
          durationPollIntervalRef.current = null
        }
      }
    }, 300)
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
          const ct = player.getCurrentTime()
          const d = player.getDuration()
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

  useEffect(() => {
    const initPlayer = () => {
      if (!window.YT?.Player || !containerRef.current || playerRef.current || !currentTrack?.id || playbackSource !== "youtube") return
      const playerVars: any = {
        autoplay: 0, controls: 0, disablekb: 1, fs: 0,
        modestbranding: 1, playsinline: 1, rel: 0, iv_load_policy: 3,
      }
      if (audioSettings.youtubeQuality !== "audio") playerVars.quality = audioSettings.youtubeQuality

      playerRef.current = new window.YT.Player("youtube-player", {
        height: "100%", width: "100%",
        videoId: currentTrack.id,
        playerVars,
        events: {
          onReady: (event: any) => {
            isPlayerReadyRef.current = true
            event.target.setVolume(100)
            if (isPlaying) {
              event.target.playVideo()
            } else {
              event.target.cueVideoById({ videoId: currentTrack.id })
            }
            startDurationPolling(event.target)
            onPlayerReadyRef.current(event.target)
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
            clearInterval(durationPollIntervalRef.current!)
            durationPollIntervalRef.current = null
            stopProgressTracking()
            onErrorRef.current(event)
          },
        },
      })
    }

    if (!window.YT) {
      const tag = document.createElement("script")
      tag.src = "https://www.youtube.com/iframe_api"
      document.getElementsByTagName("script")[0].parentNode?.insertBefore(
        tag, document.getElementsByTagName("script")[0]
      )
    }
    if (currentTrack?.id && playbackSource === "youtube") {
      if (window.YT?.Player) initPlayer()
      else window.onYouTubeIframeAPIReady = initPlayer
    }

    return () => {
      clearInterval(durationPollIntervalRef.current!)
      stopProgressTracking()
      playerRef.current?.destroy?.()
      playerRef.current = null
      isPlayerReadyRef.current = false
      window.onYouTubeIframeAPIReady = () => {}
    }
  }, [audioSettings, currentTrack?.id, playbackSource]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (playerRef.current && isPlayerReadyRef.current && currentTrack?.id && playbackSource === "youtube") {
      const currentId = playerRef.current.getVideoData?.()?.video_id;
      if (currentId === currentTrack.id) return;

      clearInterval(durationPollIntervalRef.current!)
      durationPollIntervalRef.current = null
      stopProgressTracking()
      
      if (isPlaying) {
        playerRef.current.loadVideoById({ videoId: currentTrack.id, startSeconds: 0 })
      } else {
        playerRef.current.cueVideoById({ videoId: currentTrack.id, startSeconds: 0 })
      }
      
      setTimeout(() => startDurationPolling(playerRef.current), 500)
    }
  }, [currentTrack?.id, playbackSource]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (playerRef.current && isPlayerReadyRef.current && playbackSource === "youtube") {
      const state = playerRef.current.getPlayerState?.();
      if (isPlaying) {
        if (state !== 1) playerRef.current.playVideo();
      } else {
        if (state !== 2) playerRef.current.pauseVideo();
      }
    }
  }, [isPlaying, playbackSource])

  // Single player instance — shown or hidden based on videoMode prop.
  // When ExpandablePlayer's video is active, PlayerControls mutes this player
  // so there's never two audio sources playing simultaneously.
  return (
    <div ref={containerRef}>
      <div
        className={videoMode
          ? "flex justify-center items-center bg-black w-full overflow-hidden relative z-10"
          : "absolute inset-0 opacity-[0.01] pointer-events-none z-[-1]"
        }
        style={videoMode ? { maxWidth: 640, maxHeight: 360, margin: "0 auto", aspectRatio: "16/9" } : undefined}
      >
        <div id="youtube-player" className="w-full h-full" style={{ aspectRatio: "16/9" }} />
      </div>
    </div>
  )
}
