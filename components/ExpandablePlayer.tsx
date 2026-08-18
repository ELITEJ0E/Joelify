"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion"
import { 
  ChevronDown, ChevronUp, ChevronRight, Music, AudioLinesIcon, Video, VideoOff,
  Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle,
  Disc, Image as ImageIcon, Type, ListMusic, Sparkles
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

interface ExpandablePlayerProps {
  isExpanded: boolean
  onExpandChange: (expanded: boolean) => void
  scrollProgress?: number
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
  /** Called with true when video player takes over audio, false when it releases */
  onVideoActiveChange?: (videoActive: boolean) => void
}

function isValidYouTubeId(id: string | undefined | null): boolean {
  if (!id) return false
  return /^[a-zA-Z0-9_-]{11}$/.test(id)
}

const tweenConfig = { type: "tween" as const, duration: 0.22, ease: [0.32, 0.72, 0, 1] as const }

export function ExpandablePlayer({
  isExpanded,
  onExpandChange,
  scrollProgress = 0,
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
  const [showLyrics, setShowLyrics] = useState(false)
  const [showQueue, setShowQueue] = useState(false)
  const [ambientColors, setAmbientColors] = useState<AmbientColors | null>(null)

  const actualVh = vh || (typeof window !== "undefined" ? window.innerHeight : 800)

  const progressMV = useMotionValue(scrollProgress)
  useEffect(() => {
    progressMV.set(scrollProgress)
  }, [scrollProgress, progressMV])

  const backdropOpacity = useTransform(progressMV, [0.1, 1], [0, 1])
  const sheetScale = useTransform(progressMV, [0, 1], [0.96, 1])

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

  // ── Destroy video player and reset state on close ─────────────────────────
  useEffect(() => {
    if (!isExpanded) {
      setShowVisualizer(false)
      setShowVideo(false)
      setShowLyrics(false)
      setShowQueue(false)
      destroyVideoPlayer()
    }
  }, [isExpanded, destroyVideoPlayer])

  // ── Init video player when showVideo becomes true ──────────────────────────
  useEffect(() => {
    if (!isExpanded || !showVideo || !isValidYouTubeId(currentTrack?.id) || playbackSource !== "youtube") return

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
  }, [isExpanded, showVideo, currentTrack?.id])

  // ── One-time sync ───────────
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

  // ── Keep video in sync ───────────────────────────────
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

  // ── Destroy video player when toggled off or source changes ───────────────
  useEffect(() => {
    if (!showVideo || playbackSource !== "youtube") {
      destroyVideoPlayer()
    }
  }, [showVideo, playbackSource, destroyVideoPlayer])

  // ── Scroll Snap container refs ───────────────────────────────────────────────
  const verticalScrollRef = useRef<HTMLDivElement>(null)
  const horizontalScrollRef = useRef<HTMLDivElement>(null)

  const openLyrics = useCallback(() => {
    if (verticalScrollRef.current) {
      verticalScrollRef.current.scrollTo({ top: actualVh, behavior: "smooth" })
    }
    if (typeof window !== "undefined" && window.history.state?.view !== "lyrics") {
      window.history.pushState({ view: "lyrics" }, "")
    }
  }, [actualVh])

  const closeLyrics = useCallback(() => {
    if (verticalScrollRef.current) {
      verticalScrollRef.current.scrollTo({ top: 0, behavior: "smooth" })
    }
    if (typeof window !== "undefined" && window.history.state?.view === "lyrics") {
      window.history.back()
    }
  }, [])

  const openQueue = useCallback(() => {
    if (horizontalScrollRef.current) {
      horizontalScrollRef.current.scrollTo({ left: window.innerWidth, behavior: "smooth" })
    }
    if (typeof window !== "undefined" && window.history.state?.view !== "queue") {
      window.history.pushState({ view: "queue" }, "")
    }
  }, [])

  const closeQueue = useCallback(() => {
    if (horizontalScrollRef.current) {
      horizontalScrollRef.current.scrollTo({ left: 0, behavior: "smooth" })
    }
    if (typeof window !== "undefined" && window.history.state?.view === "queue") {
      window.history.back()
    }
  }, [])

  const handleVerticalScroll = useCallback(() => {
    const el = verticalScrollRef.current
    if (!el) return
    const isShowing = el.scrollTop > el.clientHeight / 2
    setShowLyrics((prev) => {
      if (!prev && isShowing) {
        if (typeof window !== "undefined" && window.history.state?.view !== "lyrics") {
          window.history.pushState({ view: "lyrics" }, "")
        }
      }
      return prev !== isShowing ? isShowing : prev
    })
  }, [])

  const handleHorizontalScroll = useCallback(() => {
    const el = horizontalScrollRef.current
    if (!el) return
    const isShowing = el.scrollLeft > el.clientWidth / 2
    setShowQueue((prev) => {
      if (!prev && isShowing) {
        if (typeof window !== "undefined" && window.history.state?.view !== "queue") {
          window.history.pushState({ view: "queue" }, "")
        }
      }
      return prev !== isShowing ? isShowing : prev
    })
  }, [])

  const showLyricsRef = useRef(false)
  const showQueueRef = useRef(false)

  useEffect(() => {
    showLyricsRef.current = showLyrics;
    showQueueRef.current = showQueue;
  }, [showLyrics, showQueue]);

  // ── Hardware Back Button / PopState Handler ──────────────────────────────
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const view = e.state?.view
      if (view === "expandable") {
        if (showLyricsRef.current && verticalScrollRef.current) {
          verticalScrollRef.current.scrollTo({ top: 0, behavior: "smooth" })
        }
        if (showQueueRef.current && horizontalScrollRef.current) {
          horizontalScrollRef.current.scrollTo({ left: 0, behavior: "smooth" })
        }
      } else if (!view || view === "base") {
        if (showLyricsRef.current && verticalScrollRef.current) {
          verticalScrollRef.current.scrollTo({ top: 0, behavior: "smooth" })
        }
        if (showQueueRef.current && horizontalScrollRef.current) {
          horizontalScrollRef.current.scrollTo({ left: 0, behavior: "smooth" })
        }
        onExpandChange(false)
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [onExpandChange])

  const handleBackdropClick = useCallback(() => {
    onExpandChange(false)
  }, [onExpandChange])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showLyrics) {
          closeLyrics();
        } else if (showQueue) {
          closeQueue();
        } else {
          onExpandChange(false);
        }
      }
    }
    if (isExpanded) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isExpanded, onExpandChange, showLyrics, showQueue, closeLyrics, closeQueue])

  useEffect(() => {
    if (isExpanded) {
      document.documentElement.style.overscrollBehavior = 'none';
      document.body.style.overscrollBehavior = 'none';
      let style = document.getElementById('prevent-pull-to-refresh');
      if (!style) {
        style = document.createElement('style');
        style.id = 'prevent-pull-to-refresh';
        style.textContent = `
          body, html {
            overscroll-behavior-y: none !important;
          }
        `;
        document.head.appendChild(style);
      }
    } else {
      document.documentElement.style.overscrollBehavior = '';
      document.body.style.overscrollBehavior = '';
      const style = document.getElementById('prevent-pull-to-refresh');
      if (style) style.remove();
    }
    
    return () => {
      document.documentElement.style.overscrollBehavior = '';
      document.body.style.overscrollBehavior = '';
      const style = document.getElementById('prevent-pull-to-refresh');
      if (style) style.remove();
    }
  }, [isExpanded])

  return (
    <motion.div
      style={{
        scale: sheetScale,
        originY: 1,
      }}
      className="h-full w-full relative"
      onClick={handleBackdropClick}
    >
      {/* ── Ambient color extraction background with smooth crossfade ────────── */}
      <motion.div style={{ opacity: backdropOpacity }} className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
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
      </motion.div>

      {/* Solid dark base overlay for maximum contrast */}
      <div className="absolute inset-0 z-0 expandable-player-bg bg-black/40 backdrop-blur-3xl" />

      {/* Visualizer */}
      {showVisualizer && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-80">
          <SimpleVisualizer isPlaying={isPlaying} currentTime={currentTime} volume={volume} bpm={128} />
        </div>
      )}

      {/* ── Scroll Snap Container (Horizontal: Main + Queue) ─────────────────────────────── */}
      <div 
        ref={horizontalScrollRef}
        onScroll={handleHorizontalScroll}
        
        
        
        
        
        className="absolute inset-0 z-20 overflow-x-scroll snap-x snap-mandatory flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-behavior-x-contain pointer-events-auto select-none"
      >
        {/* SNAP PAGE 1: Main Player + Lyrics (Vertical Scroll) */}
        <div className="w-full h-full flex-shrink-0 relative snap-start">
          
          <div 
            ref={verticalScrollRef}
            onScroll={handleVerticalScroll}
            
            
            className="absolute inset-0 overflow-y-scroll snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {/* SNAP PAGE 1.1: Main Player UI */}
            <div 
              className="w-full h-full flex-shrink-0 relative snap-start flex flex-col z-20 glass-specular"
              onClick={(e) => e.stopPropagation()}
              
              
            >
              {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 md:px-8 md:pt-5 flex-shrink-0">
          {/* Collapse button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="icon"
                onClick={() => onExpandChange(false)}
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full h-10 w-10 transition-all active:scale-95 flex-shrink-0"
                aria-label="Close player"
              >
                <ChevronDown size={22} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>Minimize</p></TooltipContent>
          </Tooltip>

          {/* Centered NOW PLAYING title (no icon, no border) */}
          <div className="flex-1 flex items-center justify-center text-center">
            <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-white/70 select-none">
              NOW PLAYING
            </p>
          </div>

          {/* Symmetrical placeholder */}
          <div className="w-10 flex-shrink-0" />
        </div>

        {/* Mobile drag handle indicator */}
        <div className="flex justify-center mb-2 lg:hidden group cursor-pointer" onClick={() => onExpandChange(false)}>
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
                    onClick={() => showLyrics ? closeLyrics() : openLyrics()}
                    aria-label={showLyrics ? "Hide Lyrics" : "Show Lyrics"}
                    className={`h-9 px-3.5 rounded-full transition-all gap-1.5 text-xs font-medium shrink-0 whitespace-nowrap ${
                      showLyrics
                        ? "text-primary bg-primary/20 border border-primary/40 shadow-lg shadow-primary/20"
                        : "text-white/80 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10"
                    }`}
                  >
                    <Type size={15} />
                    <span>Lyrics</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>{showLyrics ? "Hide Lyrics" : "Show Lyrics"}</p></TooltipContent>
              </Tooltip>

              {/* Queue Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => showQueue ? closeQueue() : openQueue()}
                    aria-label={showQueue ? "Hide Queue" : "Show Queue"}
                    className={`h-9 px-3.5 rounded-full transition-all gap-1.5 text-xs font-medium shrink-0 whitespace-nowrap relative ${
                      showQueue
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
                <TooltipContent side="top"><p>{showQueue ? "Hide Queue" : "Show Queue"}</p></TooltipContent>
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
                        className={`h-12 w-12 rounded-full relative transition-all ${
                          repeat !== "off" 
                            ? "text-primary bg-primary/20 border border-primary/30" 
                            : "text-white/70 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {repeat === "one" ? <Repeat1 size={22} /> : <Repeat size={22} />}
                        {repeat !== "off" && (
                          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
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

      {/* SNAP PAGE 1.2: Lyrics UI */}
      <div 
        className="w-full h-full flex-shrink-0 relative snap-start sheet-surface bg-black/90 backdrop-blur-3xl flex flex-col pt-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex items-center justify-between px-6 pb-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={closeLyrics}
            className="text-white/70 hover:text-white rounded-full"
            aria-label="Close Lyrics"
          >
            <ChevronDown size={24} />
          </Button>
          <div className="w-12 h-1.5 bg-white/30 rounded-full" />
          <div className="w-10" />
        </div>
        <div className="flex-1 w-full max-w-5xl mx-auto overflow-hidden relative">
          <LyricsDisplay currentTime={currentTime} duration={duration} isPlaying={isPlaying} onSeek={onSeek} />
        </div>
      </div>
    </div>
  </div>

  {/* SNAP PAGE 2: Queue */}
  <div 
    className="w-full h-full flex-shrink-0 relative snap-start sheet-surface bg-black/90 backdrop-blur-3xl flex flex-col pt-4"
    onClick={(e) => e.stopPropagation()}
  >
    <div className="flex-shrink-0 flex items-center justify-between px-6 pb-3">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={closeQueue}
        className="text-white/70 hover:text-white rounded-full"
        aria-label="Close Queue"
      >
        <ChevronRight size={24} />
      </Button>
      <div className="flex items-center gap-2">
        <div className="w-12 h-1.5 bg-white/30 rounded-full" />
      </div>
      <div className="w-10" />
    </div>

    <div 
      className="flex-1 w-full max-w-2xl mx-auto overflow-hidden p-6 cursor-auto"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <QueueSheet onClose={closeQueue} />
    </div>
  </div>
</div>
</motion.div>
  )
}

