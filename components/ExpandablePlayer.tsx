"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { motion, useMotionValue, useTransform, type PanInfo, AnimatePresence, animate, useReducedMotion } from "framer-motion"
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

export function ExpandablePlayer({
  isExpanded,
  onExpandChange,
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

  const y = useMotionValue(0)
  const opacity = useTransform(y, [0, 300], [1, 0])
  const scale = useTransform(y, [0, 300], [1, 0.95])

  const shouldReduceMotion = useReducedMotion()
  const tweenConfig = shouldReduceMotion 
    ? { duration: 0.15 } 
    : { type: "tween" as const, duration: 0.22, ease: [0.32, 0.72, 0, 1] as const }

  const getRepeatLabel = () => {
    return repeat === "one" ? "Repeat One" : repeat === "all" ? "Repeat All" : "Repeat Off"
  }

  // ── Destroy video player and reset state on close ─────────────────────────
  useEffect(() => {
    if (!isExpanded) {
      y.set(0)
      setShowVisualizer(false)
      setShowVideo(false)
      setShowLyrics(false)
      setShowQueue(false)
      destroyVideoPlayer()
    }
  }, [isExpanded, y])

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
    onVideoActiveChange?.(false)
  }, [onVideoActiveChange])

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
      setShowVideo(false)
      destroyVideoPlayer()
    }
  }, [showVideo, playbackSource, destroyVideoPlayer])

  // ── Swipe handling for lyrics & queue ─────────────
  const wheelAccumulator = useRef<number>(0)

  const handleWheel = (e: React.WheelEvent) => {
    if (showLyrics || showQueue) return;
    
    wheelAccumulator.current += e.deltaY;
    
    if (wheelAccumulator.current > 40) {
      openLyrics()
      wheelAccumulator.current = 0;
    } else if (wheelAccumulator.current < -40) {
      wheelAccumulator.current = 0;
    }
    
    setTimeout(() => {
        wheelAccumulator.current = 0;
    }, 150);
  }

  const openLyrics = useCallback(() => {
    setShowQueue(false);
    window.history.pushState({ modal: true, type: 'expandableLyrics' }, "");
    showLyricsRef.current = true;
    setShowLyrics(true);
    animate(y, 0, tweenConfig);
  }, [y, tweenConfig]);

  const closeLyrics = useCallback(() => {
    showLyricsRef.current = false;
    setShowLyrics(false);
    animate(y, 0, tweenConfig);
    
    setTimeout(() => {
      if (window.history.state?.type === 'expandableLyrics') {
        window.history.back();
      }
    }, 0);
  }, [y, tweenConfig]);

  const openQueue = useCallback(() => {
    setShowLyrics(false);
    window.history.pushState({ modal: true, type: 'expandableQueue' }, "");
    showQueueRef.current = true;
    setShowQueue(true);
    animate(y, 0, tweenConfig);
  }, [y, tweenConfig]);

  const closeQueue = useCallback(() => {
    showQueueRef.current = false;
    setShowQueue(false);
    animate(y, 0, tweenConfig);
    
    setTimeout(() => {
      if (window.history.state?.type === 'expandableQueue') {
        window.history.back();
      }
    }, 0);
  }, [y, tweenConfig]);

  const showLyricsRef = useRef(false);
  const showQueueRef = useRef(false);
  
  useEffect(() => {
    showLyricsRef.current = showLyrics;
    showQueueRef.current = showQueue;
  }, [showLyrics, showQueue]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.type !== 'expandableLyrics' && showLyricsRef.current) {
        showLyricsRef.current = false;
        setShowLyrics(false);
        animate(y, 0, tweenConfig);
      }
      if (e.state?.type !== 'expandableQueue' && showQueueRef.current) {
        showQueueRef.current = false;
        setShowQueue(false);
        animate(y, 0, tweenConfig);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [y, tweenConfig]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    // Horizontal swipe right-to-left -> open Queue
    if ((info.offset.x < -40 || info.velocity.x < -300) && Math.abs(info.offset.x) > Math.abs(info.offset.y) * 0.6) {
      if (!showLyrics && !showQueue) {
        openQueue()
        return
      }
    }

    // Dragging down (close player or close current sheet)
    if (info.offset.y > 80 || info.velocity.y > 400) {
      if (showLyrics) {
        closeLyrics()
      } else if (showQueue) {
        closeQueue()
      } else {
        onExpandChange(false)
      }
    } 
    // Dragging up (open lyrics smoothly)
    else if (info.offset.y < -40 || info.velocity.y < -250) {
      if (!showLyrics && !showQueue) {
        openLyrics()
      }
    } else {
      animate(y, 0, tweenConfig)
    }
  }, [onExpandChange, showLyrics, showQueue, openLyrics, closeLyrics, closeQueue, openQueue, y, tweenConfig])

  const handleBackdropClick = useCallback(() => {
    if (window.innerWidth >= 1024) onExpandChange(false)
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
      initial={{ y: "100%", scale: 0.96 }}
      animate={{ y: 0, scale: 1 }}
      exit={{ y: "100%", scale: 0.96 }}
      transition={tweenConfig}
      style={{ originY: 1 }}
      className="fixed inset-0 z-[100] overflow-hidden overscroll-none"
      onClick={handleBackdropClick}
    >
      {/* ── Ambient color extraction background with smooth crossfade ────────── */}
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

      {/* Solid dark base overlay for maximum contrast */}
      <div className="absolute inset-0 z-0 expandable-player-bg bg-black/40 backdrop-blur-3xl" />

      {/* Visualizer */}
      {showVisualizer && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-80">
          <SimpleVisualizer isPlaying={isPlaying} currentTime={currentTime} volume={volume} bpm={128} />
        </div>
      )}

      {/* ── Draggable panel ─────────────────────────────────────────────── */}
      <motion.div
        drag="y"
        dragListener={!showLyrics && !showQueue}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0}
        onDragEnd={handleDragEnd}
        onWheel={handleWheel}
        style={{ y, opacity, scale, touchAction: "none" }}
        className="relative h-full w-full flex flex-col z-20 glass-specular touch-none"
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
                    "relative overflow-hidden rounded-2xl shadow-2xl shadow-black/80 ring-1 ring-white/15 transition-all duration-300",
                    !showVideo && "w-full max-w-[min(65vw,280px)] sm:max-w-[320px] aspect-square lg:w-96 lg:h-96",
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
                          className="object-cover rounded-2xl transition-transform duration-700 hover:scale-105"
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
                  <div className="flex-1">
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

            <div className="h-8 lg:h-0" />
          </div>
        </div>

        {/* ── Sliding Queue sheet (Right to Left) ─────────────────────────────── */}
        <AnimatePresence>
          {showQueue && (
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0}
              onDragEnd={(_, info) => {
                if (info.offset.x > 80 || info.velocity.x > 300) {
                  closeQueue()
                }
              }}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={tweenConfig}
              style={{ touchAction: "none" }}
              className="absolute inset-0 z-[60] sheet-surface bg-black/90 backdrop-blur-3xl flex flex-col pt-4 border-l border-white/10 touch-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex-shrink-0 flex items-center justify-between px-6 pb-3 border-b border-white/10 cursor-grab active:cursor-grabbing">
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
                onTouchStart={(e) => e.stopPropagation()}
              >
                <QueueSheet />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Sliding up Lyrics sheet ─────────────────────────────── */}
        <AnimatePresence>
          {showLyrics && (
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100 || info.velocity.y > 400) {
                  closeLyrics()
                }
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={tweenConfig}
              style={{ touchAction: "none" }}
              className="absolute inset-0 z-[60] sheet-surface bg-black/90 backdrop-blur-3xl flex flex-col pt-4 border-t border-white/10 touch-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex-shrink-0 flex items-center justify-between px-6 pb-3 border-b border-white/10 cursor-grab active:cursor-grabbing">
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

              <div 
                className="flex-1 w-full max-w-5xl mx-auto overflow-hidden relative cursor-auto"
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <LyricsDisplay currentTime={currentTime} duration={duration} isPlaying={isPlaying} onSeek={onSeek} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

