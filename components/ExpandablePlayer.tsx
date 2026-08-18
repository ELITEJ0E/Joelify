"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { motion, useMotionValue, useTransform, AnimatePresence, animate, useReducedMotion, type MotionValue } from "framer-motion"
import { 
  ChevronDown, ChevronRight, Music, AudioLinesIcon, Video, VideoOff,
  Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle,
  Disc, Image as ImageIcon, Type, ListMusic
} from "lucide-react"
import { LyricsDisplay } from "./LyricsDisplay"
import { QueueSheet } from "./QueueSheet"
import { TrackImage as Image } from "./TrackImage"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { SimpleVisualizer } from "./SimpleVisualizer"
import VinylRecord from "./VinylRecord"
import { useApp } from "@/contexts/AppContext"
import { extractAmbientColors, type AmbientColors } from "@/lib/ambientColor"

export type PlayerViewState = "none" | "player" | "queue" | "lyrics"

export interface ExpandablePlayerProps {
  playerView: PlayerViewState
  onNavigateView: (targetView: PlayerViewState) => void
  playerY?: MotionValue<number>
  vh?: number
  currentTime: number
  isPlaying: boolean
  duration: number
  volume?: number
  shuffle: boolean
  repeat: "off" | "all" | "one"
  onPlayPause: () => void
  onPrevious: () => void
  onNext: () => void
  onToggleShuffle: () => void
  onToggleRepeat: () => void
  onSeek: (value: number[]) => void
  formatTime: (time: number) => string
  onVideoActiveChange?: (videoActive: boolean) => void
}

function isValidYouTubeId(id: string | undefined | null): boolean {
  if (!id) return false
  return /^[a-zA-Z0-9_-]{11}$/.test(id)
}

const tweenConfig = { type: "tween" as const, duration: 0.22, ease: [0.32, 0.72, 0, 1] as const }

export function ExpandablePlayer({
  playerView,
  onNavigateView,
  playerY,
  vh,
  currentTime,
  isPlaying,
  duration,
  volume = 1,
  shuffle,
  repeat,
  onPlayPause,
  onPrevious,
  onNext,
  onToggleShuffle,
  onToggleRepeat,
  onSeek,
  formatTime,
  onVideoActiveChange,
}: ExpandablePlayerProps) {
  const { currentTrack, playbackSource, queue } = useApp()
  const [showVisualizer, setShowVisualizer] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const [viewMode, setViewMode] = useState<'vinyl' | 'cover'>('cover')
  const [ambientColors, setAmbientColors] = useState<AmbientColors | null>(null)

  const actualVh = vh || (typeof window !== "undefined" ? window.innerHeight : 800)
  const actualVw = typeof window !== "undefined" ? window.innerWidth : 400

  // Motion Values for Hybrid Gesture Architecture
  const internalPlayerY = useMotionValue(playerView === "none" ? actualVh : 0)
  const effectivePlayerY = playerY || internalPlayerY

  const sheetX = useMotionValue(playerView === "queue" ? -actualVw : 0)
  const sheetY = useMotionValue(playerView === "lyrics" ? -actualVh : 0)

  const shouldReduceMotion = useReducedMotion()
  const springConfig = shouldReduceMotion 
    ? { duration: 0.15 } 
    : { type: "spring" as const, stiffness: 320, damping: 32 }

  // ── Sync motion values whenever playerView changes ────────────────────────
  useEffect(() => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 400
    const h = actualVh

    if (playerView === "none") {
      animate(effectivePlayerY, h, springConfig)
    } else if (playerView === "player") {
      animate(effectivePlayerY, 0, springConfig)
      animate(sheetX, 0, springConfig)
      animate(sheetY, 0, springConfig)
    } else if (playerView === "queue") {
      animate(effectivePlayerY, 0, springConfig)
      animate(sheetX, -vw, springConfig)
      animate(sheetY, 0, springConfig)
    } else if (playerView === "lyrics") {
      animate(effectivePlayerY, 0, springConfig)
      animate(sheetX, 0, springConfig)
      animate(sheetY, -h, springConfig)
    }
  }, [playerView, actualVh, effectivePlayerY, sheetX, sheetY, springConfig])

  // ── Ambient Color Extraction ──────────────────────────────
  useEffect(() => {
    let isSubscribed = true
    if (currentTrack?.thumbnail) {
      extractAmbientColors(currentTrack.thumbnail, currentTrack.title).then((colors) => {
        if (isSubscribed) setAmbientColors(colors)
      })
    } else if (currentTrack?.title) {
      extractAmbientColors(null, currentTrack.title).then((colors) => {
        if (isSubscribed) setAmbientColors(colors)
      })
    }
    return () => { isSubscribed = false }
  }, [currentTrack?.thumbnail, currentTrack?.title])

  // ── Local video YT instance ────────
  const videoPlayerRef = useRef<any>(null)
  const videoReadyRef = useRef(false)
  const initialSyncDoneRef = useRef(false)

  const getRepeatLabel = () => {
    return repeat === "one" ? "Repeat One" : repeat === "all" ? "Repeat All" : "Repeat Off"
  }

  const destroyVideoPlayer = useCallback(() => {
    try {
      if (videoPlayerRef.current?.destroy) {
        videoPlayerRef.current.destroy()
      }
    } catch (error) {
      console.error("Error destroying YouTube player:", error)
    }
    videoPlayerRef.current = null
    videoReadyRef.current = false
    initialSyncDoneRef.current = false
    queueMicrotask(() => {
      onVideoActiveChange?.(false)
    })
  }, [onVideoActiveChange])

  // Destroy video player on minimize
  useEffect(() => {
    if (playerView === "none") {
      setShowVisualizer(false)
      setShowVideo(false)
      destroyVideoPlayer()
    }
  }, [playerView, destroyVideoPlayer])

  // Init video player when showVideo becomes true
  useEffect(() => {
    if (playerView === "none" || !showVideo || !isValidYouTubeId(currentTrack?.id) || playbackSource !== "youtube") return

    const timer = setTimeout(() => {
      if (!window.YT?.Player || videoPlayerRef.current) return

      videoPlayerRef.current = new window.YT.Player("expanded-yt-video", {
        height: "100%",
        width: "100%",
        videoId: currentTrack!.id,
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: () => {
            videoReadyRef.current = true
            initialSyncDoneRef.current = false
            onVideoActiveChange?.(true)
          },
        },
      })
    }, 50)

    return () => {
      clearTimeout(timer)
      destroyVideoPlayer()
    }
  }, [playerView, showVideo, currentTrack?.id, playbackSource, onVideoActiveChange, destroyVideoPlayer])

  // Sync video time
  useEffect(() => {
    if (!videoReadyRef.current || initialSyncDoneRef.current || !videoPlayerRef.current) return
    initialSyncDoneRef.current = true
    try {
      if (typeof videoPlayerRef.current.seekTo === 'function') {
        videoPlayerRef.current.seekTo(currentTime, true)
      }
      if (isPlaying) {
        if (typeof videoPlayerRef.current.playVideo === 'function') videoPlayerRef.current.playVideo()
      } else {
        if (typeof videoPlayerRef.current.pauseVideo === 'function') videoPlayerRef.current.pauseVideo()
      }
    } catch (error) {
      console.warn("Error syncing expanded YouTube player (initial):", error)
    }
  }, [isPlaying, currentTime])

  useEffect(() => {
    if (!videoPlayerRef.current || !videoReadyRef.current) return
    try {
      if (isPlaying) {
        if (typeof videoPlayerRef.current.playVideo === 'function') videoPlayerRef.current.playVideo()
      } else {
        if (typeof videoPlayerRef.current.pauseVideo === 'function') videoPlayerRef.current.pauseVideo()
      }
    } catch (error) {
      console.warn("Error syncing expanded YouTube player (update):", error)
    }
  }, [isPlaying])

  useEffect(() => {
    if (!showVideo || playbackSource !== "youtube") {
      destroyVideoPlayer()
    }
  }, [showVideo, playbackSource, destroyVideoPlayer])

  // ── Touch Gesture Engine ───────────────────────────────────────────────────

  // 1. Main Player Gestures (Swipe DOWN -> Minimize, Swipe LEFT -> Queue, Swipe UP -> Lyrics)
  const mainTouchRef = useRef<{
    startX: number
    startY: number
    startTime: number
    gesture: "none" | "close_player" | "open_queue" | "open_lyrics"
  }>({ startX: 0, startY: 0, startTime: 0, gesture: "none" })

  const handleMainTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button, input, [role="slider"], a, .no-drag')) {
      mainTouchRef.current.gesture = "none"
      return
    }
    const touch = e.touches[0]
    mainTouchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      gesture: "none",
    }
  }

  const handleMainTouchMove = (e: React.TouchEvent) => {
    if (playerView !== "player") return
    const touch = e.touches[0]
    const dx = touch.clientX - mainTouchRef.current.startX
    const dy = touch.clientY - mainTouchRef.current.startY

    if (mainTouchRef.current.gesture === "none") {
      const absX = Math.abs(dx)
      const absY = Math.abs(dy)
      if (absX > 8 || absY > 8) {
        if (absX > absY) {
          if (dx < 0) mainTouchRef.current.gesture = "open_queue"
        } else {
          if (dy > 0) mainTouchRef.current.gesture = "close_player"
          else if (dy < 0) mainTouchRef.current.gesture = "open_lyrics"
        }
      }
    }

    if (mainTouchRef.current.gesture === "close_player") {
      if (dy > 0) {
        effectivePlayerY.set(dy)
      }
    } else if (mainTouchRef.current.gesture === "open_queue") {
      if (dx < 0) {
        sheetX.set(Math.max(-actualVw, dx))
      }
    } else if (mainTouchRef.current.gesture === "open_lyrics") {
      if (dy < 0) {
        sheetY.set(Math.max(-actualVh, dy))
      }
    }
  }

  const handleMainTouchEnd = (e: React.TouchEvent) => {
    if (mainTouchRef.current.gesture === "none") return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - mainTouchRef.current.startX
    const dy = touch.clientY - mainTouchRef.current.startY
    const dt = Math.max(0.01, (Date.now() - mainTouchRef.current.startTime) / 1000)
    const vx = dx / dt
    const vy = dy / dt

    const gesture = mainTouchRef.current.gesture
    mainTouchRef.current.gesture = "none"

    if (gesture === "close_player") {
      if (dy > actualVh * 0.18 || vy > 350) {
        onNavigateView("none")
      } else {
        animate(effectivePlayerY, 0, springConfig)
      }
    } else if (gesture === "open_queue") {
      if (dx < -actualVw * 0.18 || vx < -350) {
        onNavigateView("queue")
      } else {
        animate(sheetX, 0, springConfig)
      }
    } else if (gesture === "open_lyrics") {
      if (dy < -actualVh * 0.18 || vy < -350) {
        onNavigateView("lyrics")
      } else {
        animate(sheetY, 0, springConfig)
      }
    }
  }

  // 2. Queue Sheet Gestures (Swipe RIGHT -> Return to Player, preserves vertical queue scrolling)
  const queueTouchRef = useRef<{
    startX: number
    startY: number
    startTime: number
    isClosing: boolean
  }>({ startX: 0, startY: 0, startTime: 0, isClosing: false })

  const handleQueueTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    queueTouchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      isClosing: false,
    }
  }

  const handleQueueTouchMove = (e: React.TouchEvent) => {
    if (playerView !== "queue") return
    const touch = e.touches[0]
    const dx = touch.clientX - queueTouchRef.current.startX
    const dy = touch.clientY - queueTouchRef.current.startY

    if (!queueTouchRef.current.isClosing) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) && dx > 0) {
        queueTouchRef.current.isClosing = true
      }
    }

    if (queueTouchRef.current.isClosing) {
      if (e.cancelable) e.preventDefault()
      sheetX.set(Math.min(0, Math.max(-actualVw, -actualVw + dx)))
    }
  }

  const handleQueueTouchEnd = (e: React.TouchEvent) => {
    if (!queueTouchRef.current.isClosing) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - queueTouchRef.current.startX
    const dt = Math.max(0.01, (Date.now() - queueTouchRef.current.startTime) / 1000)
    const vx = dx / dt

    queueTouchRef.current.isClosing = false

    if (dx > actualVw * 0.18 || vx > 350) {
      onNavigateView("player")
    } else {
      animate(sheetX, -actualVw, springConfig)
    }
  }

  // 3. Lyrics Sheet Gestures (Swipe DOWN when at top -> Return to Player, preserves vertical lyrics scrolling)
  const lyricsContainerRef = useRef<HTMLDivElement>(null)
  const lyricsTouchRef = useRef<{
    startX: number
    startY: number
    startTime: number
    isClosing: boolean
  }>({ startX: 0, startY: 0, startTime: 0, isClosing: false })

  const handleLyricsTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    lyricsTouchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      isClosing: false,
    }
  }

  const handleLyricsTouchMove = (e: React.TouchEvent) => {
    if (playerView !== "lyrics") return
    const touch = e.touches[0]
    const dx = touch.clientX - lyricsTouchRef.current.startX
    const dy = touch.clientY - lyricsTouchRef.current.startY

    const scrollTop = lyricsContainerRef.current?.scrollTop || 0

    if (!lyricsTouchRef.current.isClosing) {
      if (scrollTop <= 2 && dy > 10 && dy > Math.abs(dx)) {
        lyricsTouchRef.current.isClosing = true
      }
    }

    if (lyricsTouchRef.current.isClosing) {
      if (e.cancelable) e.preventDefault()
      sheetY.set(Math.min(0, Math.max(-actualVh, -actualVh + dy)))
    }
  }

  const handleLyricsTouchEnd = (e: React.TouchEvent) => {
    if (!lyricsTouchRef.current.isClosing) return
    const touch = e.changedTouches[0]
    const dy = touch.clientY - lyricsTouchRef.current.startY
    const dt = Math.max(0.01, (Date.now() - lyricsTouchRef.current.startTime) / 1000)
    const vy = dy / dt

    lyricsTouchRef.current.isClosing = false

    if (dy > actualVh * 0.18 || vy > 350) {
      onNavigateView("player")
    } else {
      animate(sheetY, -actualVh, springConfig)
    }
  }

  // Desktop Mouse Wheel Navigation
  const handleWheel = (e: React.WheelEvent) => {
    const absX = Math.abs(e.deltaX)
    const absY = Math.abs(e.deltaY)

    if (absX > absY && absX > 30) {
      if (e.deltaX > 30 && playerView === "player") {
        onNavigateView("queue")
      } else if (e.deltaX < -30 && playerView === "queue") {
        onNavigateView("player")
      }
    } else if (absY > absX && absY > 30) {
      if (e.deltaY > 30 && playerView === "player") {
        onNavigateView("lyrics")
      } else if (e.deltaY < -30 && playerView === "lyrics") {
        onNavigateView("player")
      }
    }
  }

  // Escape key support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (playerView === "lyrics" || playerView === "queue") {
          onNavigateView("player")
        } else if (playerView === "player") {
          onNavigateView("none")
        }
      }
    }
    if (playerView !== "none") {
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [playerView, onNavigateView])

  return (
    <motion.div
      style={{
        y: effectivePlayerY,
      }}
      className="fixed inset-0 z-50 overflow-hidden bg-black/90 backdrop-blur-3xl touch-none flex flex-col"
      onWheel={handleWheel}
    >
      {/* Background ambient colors */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentTrack?.id || "default-ambient"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0"
            style={{
              background: ambientColors?.darkBackdrop || "radial-gradient(ellipse at 50% 30%, rgba(30,30,45,0.8) 0%, rgba(5,5,8,0.98) 100%)",
            }}
          />
        </AnimatePresence>
      </div>

      <div className="absolute inset-0 z-0 expandable-player-bg bg-black/40 backdrop-blur-3xl" />

      {/* Visualizer */}
      {showVisualizer && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-80">
          <SimpleVisualizer isPlaying={isPlaying} currentTime={currentTime} volume={volume} bpm={128} />
        </div>
      )}

      {/* ── Main Sliding Container ───────────────────────────────────── */}
      <motion.div
        style={{ x: sheetX }}
        className="w-[200vw] h-full flex z-20"
      >
        {/* COLUMN 1: Main Player + Lyrics (Vertical Stack: 200vh) */}
        <motion.div
          style={{ y: sheetY }}
          className="w-[100vw] h-[200vh] flex flex-col relative flex-shrink-0"
        >
          {/* PAGE 1.1: Main Player UI (100vh) */}
          <div
            className="w-full h-screen flex-shrink-0 relative flex flex-col z-20 glass-specular"
            onTouchStart={handleMainTouchStart}
            onTouchMove={handleMainTouchMove}
            onTouchEnd={handleMainTouchEnd}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 md:px-8 md:pt-5 flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => onNavigateView("none")}
                    className="text-white/70 hover:text-white hover:bg-white/10 rounded-full h-10 w-10 transition-all active:scale-95 flex-shrink-0"
                    aria-label="Close player"
                  >
                    <ChevronDown size={22} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Minimize</p></TooltipContent>
              </Tooltip>

              <div className="flex-1 flex items-center justify-center text-center">
                <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-white/70 select-none">
                  NOW PLAYING
                </p>
              </div>

              <div className="w-10 flex-shrink-0" />
            </div>

            {/* Mobile drag handle indicator */}
            <div className="flex justify-center mb-2 lg:hidden group cursor-pointer" onClick={() => onNavigateView("none")}>
              <div className="w-12 h-1.5 bg-white/20 rounded-full group-hover:w-16 group-hover:bg-white/40 transition-all duration-300" />
            </div>

            {/* ── Main content layout ───────────────────── */}
            <div className="flex-1 flex flex-col lg:flex-row lg:items-center lg:justify-center lg:gap-12 xl:gap-16 px-5 md:px-8 lg:px-12 pb-safe overflow-y-auto lg:overflow-hidden">
              {/* LEFT SIDE: Album Artwork */}
              <div className="lg:flex-1 lg:flex lg:justify-end w-full">
                <div className="flex flex-col items-center w-full">
                  <motion.div
                    initial={{ scale: 0.75, opacity: 0.6, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.75, opacity: 0.6, y: 30 }}
                    transition={tweenConfig}
                    className="w-full flex justify-center"
                  >
                    <div
                      className={[
                        "relative overflow-hidden rounded-2xl shadow-2xl shadow-black/80 transition-all duration-300",
                        !showVideo && "w-full max-w-[min(88vw,380px)] sm:max-w-[440px] aspect-square lg:w-[440px] lg:h-[440px]",
                        showVideo && "w-full h-[35vh] sm:h-[45vh] lg:max-w-[800px] lg:aspect-video lg:h-auto",
                      ].filter(Boolean).join(" ")}
                    >
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className={`w-full h-full flex items-center justify-center bg-black ${showVideo ? 'block' : 'hidden'}`}>
                          <div id="expanded-yt-video" className="w-full h-full" />
                        </div>
                        {!showVideo && (
                          viewMode === 'vinyl' ? (
                            <div className="w-full h-full flex items-center justify-center rounded-2xl bg-zinc-900/40">
                              <VinylRecord isPlaying={isPlaying} coverImage={currentTrack?.thumbnail || undefined} />
                            </div>
                          ) : currentTrack?.thumbnail ? (
                            <Image
                              src={currentTrack.thumbnail}
                              alt={currentTrack.title || "Album art"}
                              fill
                              className="object-cover rounded-2xl"
                              priority
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-800/80 rounded-2xl flex items-center justify-center">
                              <Music size={56} className="text-zinc-600" />
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </motion.div>

                  <div className="h-4 lg:h-6" />
                </div>
              </div>

              {/* ── RIGHT SIDE: Track info + controls ───────────────── */}
              <div className="lg:flex-1 lg:max-w-md xl:max-w-lg">
                {/* Track info */}
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="text-center lg:text-left mb-4"
                >
                  <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1.5 line-clamp-2 text-balance tracking-tight">
                    {currentTrack?.title || "No Track Playing"}
                  </h1>
                  <p className="text-sm sm:text-base md:text-lg text-white/60 font-medium">
                    {currentTrack?.artist || "Unknown Artist"}
                  </p>
                </motion.div>

                {/* Action Buttons Row: Lyrics, Queue, Visualizer, Vinyl/Cover, Video */}
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  className="w-full flex items-center justify-start sm:justify-center lg:justify-start gap-2 overflow-x-auto flex-nowrap mb-4 py-1 px-1 -mx-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                  {/* Lyrics Toggle */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => playerView === "lyrics" ? onNavigateView("player") : onNavigateView("lyrics")}
                        aria-label={playerView === "lyrics" ? "Hide Lyrics" : "Show Lyrics"}
                        className={`h-9 px-3.5 rounded-full transition-all gap-1.5 text-xs font-medium shrink-0 whitespace-nowrap ${
                          playerView === "lyrics"
                            ? "text-primary bg-primary/20 border border-primary/40 shadow-lg shadow-primary/20"
                            : "text-white/80 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10"
                        }`}
                      >
                        <Type size={15} />
                        <span>Lyrics</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p>{playerView === "lyrics" ? "Hide Lyrics" : "Show Lyrics"}</p></TooltipContent>
                  </Tooltip>

                  {/* Queue Toggle */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => playerView === "queue" ? onNavigateView("player") : onNavigateView("queue")}
                        aria-label={playerView === "queue" ? "Hide Queue" : "Show Queue"}
                        className={`h-9 px-3.5 rounded-full transition-all gap-1.5 text-xs font-medium shrink-0 whitespace-nowrap relative ${
                          playerView === "queue"
                            ? "text-primary bg-primary/20 border border-primary/40 shadow-lg shadow-primary/20"
                            : "text-white/80 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10"
                        }`}
                      >
                        <ListMusic size={15} />
                        <span>Queue</span>
                        {queue.length > 0 && (
                          <span className="ml-0.5 bg-primary text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                            {queue.length}
                          </span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p>{playerView === "queue" ? "Hide Queue" : "Show Queue"}</p></TooltipContent>
                  </Tooltip>

                  {/* Visualizer Toggle */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowVisualizer((v) => !v)}
                        aria-label={showVisualizer ? "Hide visualizer" : "Show visualizer"}
                        className={`h-9 w-9 rounded-full transition-all shrink-0 ${
                          showVisualizer
                            ? "text-primary bg-primary/20 border border-primary/40"
                            : "text-white/80 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10"
                        }`}
                      >
                        <AudioLinesIcon size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p>{showVisualizer ? "Hide Visualizer" : "Show Visualizer"}</p></TooltipContent>
                  </Tooltip>

                  {/* Vinyl/Cover view toggle */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewMode(prev => prev === 'vinyl' ? 'cover' : 'vinyl')}
                        aria-label={viewMode === 'vinyl' ? "Switch to cover view" : "Switch to vinyl view"}
                        className={`h-9 w-9 rounded-full transition-all shrink-0 ${
                          viewMode === 'vinyl'
                            ? "text-primary bg-primary/20 border border-primary/40"
                            : "text-white/80 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10"
                        }`}
                      >
                        {viewMode === 'vinyl' ? <ImageIcon size={16} /> : <Disc size={16} />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{viewMode === 'vinyl' ? "Switch to Cover" : "Switch to Vinyl"}</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* YouTube video toggle */}
                  {playbackSource === "youtube" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowVideo((v) => !v)}
                          disabled={!currentTrack}
                          aria-label={showVideo ? "Hide video" : "Show video"}
                          className={`h-9 w-9 rounded-full transition-all shrink-0 ${
                            showVideo
                              ? "text-primary bg-primary/20 border border-primary/40"
                              : "text-white/80 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10"
                          }`}
                        >
                          {showVideo ? <VideoOff size={16} /> : <Video size={16} />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p>{showVideo ? "Hide Video" : "Show Video"}</p></TooltipContent>
                    </Tooltip>
                  )}
                </motion.div>

                <div className="hidden lg:block h-px bg-white/10 w-full mb-6" />

                {/* Controls */}
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="w-full"
                >
                  <div className="flex flex-col items-center w-full gap-5">
                    {/* Progress bar */}
                    <div className="flex items-center gap-3 w-full max-w-2xl mx-auto">
                      <span className="text-xs font-medium text-white/60 w-10 text-right">{formatTime(currentTime)}</span>
                      <div className="flex-1" onPointerDown={(e) => e.stopPropagation()}>
                        <Slider 
                          value={[currentTime]} 
                          max={duration > 0 ? duration : 1} 
                          step={0.1}
                          onValueChange={onSeek} 
                          disabled={!currentTrack || duration === 0} 
                          className="[&_.slider-thumb]:bg-primary [&_.slider-thumb]:border-2 [&_.slider-thumb]:border-white"
                        />
                      </div>
                      <span className="text-xs font-medium text-white/60 w-10">{formatTime(duration)}</span>
                    </div>

                    {/* Control buttons */}
                    <div className="flex items-center justify-center gap-4">
                      {/* Shuffle */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={onToggleShuffle} 
                            disabled={!currentTrack}
                            className={`h-12 w-12 rounded-full transition-all ${
                              shuffle 
                                ? "text-primary bg-primary/20 border border-primary/30" 
                                : "text-white/70 hover:text-white hover:bg-white/10"
                            }`}
                          >
                            <Shuffle size={22} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>{shuffle ? "Shuffle On" : "Shuffle Off"}</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* Previous */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={onPrevious} 
                            disabled={!currentTrack}
                            className="h-12 w-12 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-90"
                          >
                            <SkipBack size={26} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>Previous</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* Play/Pause */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="icon" 
                            className="bg-white text-black rounded-full h-16 w-16 hover:scale-105 active:scale-95 hover:bg-primary hover:text-white transition-all shadow-xl shadow-primary/25 ring-4 ring-white/10"
                            onClick={onPlayPause} 
                            disabled={!currentTrack}
                          >
                            {isPlaying ? 
                              <Pause fill="currentColor" size={28} className="stroke-[1.5]" /> : 
                              <Play fill="currentColor" size={28} className="stroke-[1.5] ml-0.5" />
                            }
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>{isPlaying ? "Pause" : "Play"}</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* Next */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={onNext} 
                            disabled={!currentTrack}
                            className="h-12 w-12 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-90"
                          >
                            <SkipForward size={26} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>Next</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* Repeat */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={onToggleRepeat} 
                            disabled={!currentTrack}
                            className={`h-12 w-12 rounded-full transition-all ${
                              repeat !== "off" 
                                ? "text-primary bg-primary/20 border border-primary/30" 
                                : "text-white/70 hover:text-white hover:bg-white/10"
                            }`}
                          >
                            {repeat === "one" ? <Repeat1 size={22} /> : <Repeat size={22} />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>{getRepeatLabel()}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* PAGE 1.2: Lyrics UI (100vh) */}
          <div
            className="w-full h-screen flex-shrink-0 relative sheet-surface bg-black/90 backdrop-blur-3xl flex flex-col pt-4"
            onTouchStart={handleLyricsTouchStart}
            onTouchMove={handleLyricsTouchMove}
            onTouchEnd={handleLyricsTouchEnd}
          >
            <div className="flex-shrink-0 flex items-center justify-between px-6 pb-3 border-b border-white/10">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigateView("player")}
                className="text-white/70 hover:text-white rounded-full"
                aria-label="Close Lyrics"
              >
                <ChevronDown size={24} />
              </Button>
              <div className="w-12 h-1.5 bg-white/30 rounded-full cursor-pointer" onClick={() => onNavigateView("player")} />
              <div className="text-xs font-semibold text-white/80 uppercase tracking-wider">Lyrics</div>
              <div className="w-10" />
            </div>
            <div ref={lyricsContainerRef} className="flex-1 w-full max-w-5xl mx-auto overflow-y-auto relative p-6">
              <LyricsDisplay currentTime={currentTime} duration={duration} isPlaying={isPlaying} onSeek={onSeek} />
            </div>
          </div>
        </motion.div>

        {/* COLUMN 2: Queue UI (100vw, 100vh) */}
        <div
          className="w-[100vw] h-screen flex-shrink-0 relative sheet-surface bg-black/90 backdrop-blur-3xl flex flex-col pt-4"
          onTouchStart={handleQueueTouchStart}
          onTouchMove={handleQueueTouchMove}
          onTouchEnd={handleQueueTouchEnd}
        >
          <div className="flex-shrink-0 flex items-center justify-between px-6 pb-3 border-b border-white/10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigateView("player")}
              className="text-white/70 hover:text-white rounded-full"
              aria-label="Close Queue"
            >
              <ChevronRight size={24} />
            </Button>
            <div className="w-12 h-1.5 bg-white/30 rounded-full cursor-pointer" onClick={() => onNavigateView("player")} />
            <div className="text-xs font-semibold text-white/80 uppercase tracking-wider">Up Next</div>
            <div className="w-10" />
          </div>

          <div className="flex-1 w-full max-w-2xl mx-auto overflow-hidden p-6 cursor-auto">
            <QueueSheet onClose={() => onNavigateView("player")} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
