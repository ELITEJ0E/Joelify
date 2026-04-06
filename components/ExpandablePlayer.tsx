"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion"
import {
  ChevronDown, Music, AudioLinesIcon, Video, VideoOff,
  Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle
} from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { SimpleVisualizer } from "./SimpleVisualizer"
import { useApp } from "@/contexts/AppContext"

// Global declaration for YouTube API
declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

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
  onVideoActiveChange?: (videoActive: boolean) => void
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
  const { currentTrack } = useApp()
  const [showVisualizer, setShowVisualizer] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isDestroying, setIsDestroying] = useState(false)

  const videoPlayerRef = useRef<any>(null)
  const videoReadyRef = useRef(false)
  const initialSyncDoneRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const y = useMotionValue(0)
  const opacity = useTransform(y, [0, 300], [1, 0])
  const scale = useTransform(y, [0, 300], [1, 0.95])

  const getRepeatLabel = () => {
    return repeat === "one" ? "Repeat One" : repeat === "all" ? "Repeat All" : "Repeat Off"
  }

  // Error boundary effect
  useEffect(() => {
    if (error) {
      console.error("ExpandablePlayer Error:", error)
    }
  }, [error])

  useEffect(() => {
    if (!isExpanded) {
      y.set(0)
      setShowVisualizer(false)
      setShowVideo(false)
      destroyVideoPlayer()
    }
  }, [isExpanded, y])

  const destroyVideoPlayer = useCallback(() => {
    setIsDestroying(true)
    try {
      if (videoPlayerRef.current?.destroy) {
        videoPlayerRef.current.destroy()
      }
    } catch (err) {
      console.error("Error destroying video player:", err)
    }
    videoPlayerRef.current = null
    videoReadyRef.current = false
    initialSyncDoneRef.current = false
    onVideoActiveChange?.(false)

    // Small delay to ensure cleanup is complete
    setTimeout(() => {
      setIsDestroying(false)
    }, 100)
  }, [onVideoActiveChange])

  // Load YouTube API safely
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && !window.YT) {
        const tag = document.createElement("script")
        tag.src = "https://www.youtube.com/iframe_api"
        const firstScriptTag = document.getElementsByTagName("script")[0]
        if (firstScriptTag?.parentNode) {
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
        }
      }
    } catch (err) {
      console.error("Error loading YouTube API:", err)
      setError(err instanceof Error ? err : new Error("Failed to load YouTube API"))
    }
  }, [])

  // Init video player
  useEffect(() => {
    if (!isExpanded || !showVideo || !currentTrack?.id || isDestroying) return

    const initPlayer = () => {
      try {
        if (!window.YT?.Player || videoPlayerRef.current) return

        const element = document.getElementById("expanded-yt-video")
        if (!element) {
          console.error("Video container element not found")
          return
        }

        videoPlayerRef.current = new window.YT.Player("expanded-yt-video", {
          height: "100%",
          width: "100%",
          videoId: currentTrack.id,
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
            onError: (event: any) => {
              console.error("YouTube Player Error:", event)
              setError(new Error(`YouTube Error: ${event.data}`))
            },
          },
        })
      } catch (err) {
        console.error("Error initializing YouTube player:", err)
        setError(err instanceof Error ? err : new Error("Failed to initialize YouTube player"))
      }
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (window.YT?.Player) {
        initPlayer()
      } else {
        window.onYouTubeIframeAPIReady = initPlayer
      }
    }, 50)

    return () => {
      clearTimeout(timer)
      destroyVideoPlayer()
    }
  }, [isExpanded, showVideo, currentTrack?.id, onVideoActiveChange, isDestroying, destroyVideoPlayer])

  // One-time sync
  useEffect(() => {
    if (!videoReadyRef.current || initialSyncDoneRef.current || !videoPlayerRef.current || isDestroying) return
    initialSyncDoneRef.current = true
    try {
      videoPlayerRef.current.seekTo(currentTime, true)
      if (isPlaying) videoPlayerRef.current.playVideo()
      else videoPlayerRef.current.pauseVideo()
    } catch (err) {
      console.error("Error syncing video:", err)
    }
  }, [currentTime, isPlaying, isDestroying])

  // Keep video in sync
  useEffect(() => {
    if (!videoPlayerRef.current || !videoReadyRef.current || isDestroying) return
    try {
      if (isPlaying) videoPlayerRef.current.playVideo()
      else videoPlayerRef.current.pauseVideo()
    } catch (err) {
      console.error("Error toggling video playback:", err)
    }
  }, [isPlaying, isDestroying])

  // Handle video toggle with proper cleanup
  const handleToggleVideo = useCallback(() => {
    if (showVideo) {
      // Turning video OFF - destroy player first
      destroyVideoPlayer()
      // Then update state
      setTimeout(() => {
        setShowVideo(false)
      }, 50)
    } else {
      // Turning video ON
      setShowVideo(true)
    }
  }, [showVideo, destroyVideoPlayer])

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onExpandChange(false)
    else y.set(0)
  }, [onExpandChange, y])

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.innerWidth >= 1024) onExpandChange(false)
  }, [onExpandChange])

  const handleStopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  // Escape key closes the player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExpandChange(false)
    }
    if (isExpanded) window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isExpanded, onExpandChange])

  if (!isExpanded) return null

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 overflow-hidden"
        onClick={handleBackdropClick}
      >
        {/* Album-art blur backdrop */}
        {currentTrack?.thumbnail && !showVisualizer && (
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `url(${currentTrack.thumbnail})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(60px) brightness(0.15) saturate(2)",
              transform: "scale(1.15)",
            }}
          />
        )}

        {/* Solid dark background */}
        <div className="absolute inset-0 z-0 bg-zinc-950" />

        {/* Subtle animating gradient */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-black via-primary/20 to-black animate-gradient-move" />

        {/* Visualizer */}
        {showVisualizer && (
          <div className="absolute inset-0 z-0 pointer-events-none">
            <SimpleVisualizer isPlaying={isPlaying} currentTime={currentTime} volume={volume} bpm={128} />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/20 via-black/40 to-black/80 pointer-events-none" />

        {/* Draggable panel */}
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          style={{ y, opacity, scale }}
          className="relative h-full w-full flex flex-col z-20"
          onClick={handleStopPropagation}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2 md:px-8 md:pt-5 flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="icon"
                  onClick={() => onExpandChange(false)}
                  className="text-white/60 hover:text-white hover:bg-primary/15 h-10 w-10 transition-colors"
                  aria-label="Close player"
                >
                  <ChevronDown size={20} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Close</p></TooltipContent>
            </Tooltip>

            <p className="text-xs font-semibold uppercase tracking-widest text-white/45 select-none">
              Now Playing
            </p>

            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="icon"
                    onClick={handleToggleVideo}
                    disabled={!currentTrack || isDestroying}
                    aria-label={showVideo ? "Hide video" : "Show video"}
                    className={`h-10 w-10 transition-colors ${showVideo
                      ? "text-primary bg-primary/10 hover:bg-primary/20"
                      : "text-white/60 hover:text-white hover:bg-primary/15"
                      }`}
                  >
                    {showVideo ? <VideoOff size={18} /> : <Video size={18} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>{showVideo ? "Hide Video" : "Show Video"}</p></TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => setShowVisualizer((v) => !v)}
                    aria-label={showVisualizer ? "Hide visualizer" : "Show visualizer"}
                    className={`h-10 w-10 transition-colors ${showVisualizer
                      ? "text-primary bg-primary/10 hover:bg-primary/20"
                      : "text-white/60 hover:text-white hover:bg-primary/15"
                      }`}
                  >
                    <AudioLinesIcon size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>{showVisualizer ? "Hide Visualizer" : "Show Visualizer"}</p></TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Mobile drag handle */}
          <div className="flex justify-center mb-2 lg:hidden group cursor-pointer" onClick={() => onExpandChange(false)}>
            <div className="w-12 h-1 bg-white/20 rounded-full group-hover:w-16 group-hover:bg-white/40 transition-all duration-300" />
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col lg:flex-row lg:items-center lg:justify-center lg:gap-12 xl:gap-16 px-5 md:px-8 lg:px-12 pb-safe overflow-y-auto">
            {/* LEFT SIDE */}
            <div className="lg:flex-1 lg:flex lg:justify-end w-full">
              <div className="flex flex-col items-center w-full">
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.45 }}
                  className="w-full flex justify-center"
                >
                  <div
                    className={[
                      "relative overflow-hidden rounded-2xl shadow-2xl shadow-black/60 ring-1 ring-white/10 transition-all duration-300",
                      "w-full max-w-[min(85vw,380px)] aspect-square",
                      !showVideo && "lg:w-96 lg:h-96",
                      showVideo && "lg:max-w-[800px] lg:aspect-video lg:h-auto",
                    ].filter(Boolean).join(" ")}
                  >
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      {showVideo && !isDestroying ? (
                        <div className="w-full h-full flex items-center justify-center bg-black rounded-2xl overflow-hidden">
                          <div id="expanded-yt-video" className="w-full h-full" ref={containerRef} />
                        </div>
                      ) : currentTrack?.thumbnail ? (
                        <div className="relative w-full h-full">
                          <img
                            src={currentTrack.thumbnail}
                            alt={currentTrack.title || "Album art"}
                            className="object-cover rounded-2xl w-full h-full"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full bg-zinc-800/80 rounded-2xl flex items-center justify-center">
                          <Music size={56} className="text-zinc-600" />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>

                <div className="h-4 lg:h-6" />
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="lg:flex-1 lg:max-w-md xl:max-w-lg">
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="text-center lg:text-left mb-8"
              >
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1.5 line-clamp-2 text-balance">
                  {currentTrack?.title || "No Track Playing"}
                </h1>
                <p className="text-sm sm:text-base md:text-lg text-white/55">
                  {currentTrack?.artist || "Unknown Artist"}
                </p>
              </motion.div>

              <div className="hidden lg:block h-px bg-white/10 w-full mb-6" />

              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="w-full"
              >
                <div className="flex flex-col items-center w-full gap-4">
                  {/* Progress bar */}
                  <div className="flex items-center gap-2 w-full max-w-2xl mx-auto">
                    <span className="text-sm text-white/60 w-10 text-right">{formatTime(currentTime)}</span>
                    <div className="flex-1">
                      <Slider
                        value={[currentTime]}
                        max={duration > 0 ? duration : 1}
                        step={0.1}
                        onValueChange={onSeek}
                        disabled={!currentTrack || duration === 0}
                        className="[&_.slider-thumb]:bg-primary"
                      />
                    </div>
                    <span className="text-sm text-white/60 w-10">{formatTime(duration)}</span>
                  </div>

                  {/* Control buttons */}
                  <div className="flex items-center justify-center gap-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={onToggleShuffle}
                          disabled={!currentTrack}
                          className={`h-14 w-14 transition-colors ${shuffle ? "text-primary bg-primary/10" : "text-white/60 hover:text-white hover:bg-primary/15"}`}
                        >
                          <Shuffle size={24} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p>{shuffle ? "Shuffle On" : "Shuffle Off"}</p></TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" onClick={onPrevious} disabled={!currentTrack} className="h-14 w-14 text-white/60 hover:text-white hover:bg-primary/15 transition-colors">
                          <SkipBack size={28} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p>Previous</p></TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" className="bg-white text-black rounded-full h-16 w-16 hover:scale-105 hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/20 ring-2 ring-primary/20" onClick={onPlayPause} disabled={!currentTrack}>
                          {isPlaying ? <Pause fill="currentColor" size={32} className="stroke-[1.5]" /> : <Play fill="currentColor" size={32} className="stroke-[1.5] ml-0.5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p>{isPlaying ? "Pause" : "Play"}</p></TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" onClick={onNext} disabled={!currentTrack} className="h-14 w-14 text-white/60 hover:text-white hover:bg-primary/15 transition-colors">
                          <SkipForward size={28} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p>Next</p></TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" onClick={onToggleRepeat} disabled={!currentTrack} className={`h-14 w-14 relative transition-colors ${repeat !== "off" ? "text-primary bg-primary/10 hover:bg-primary/20" : "text-white/60 hover:text-white hover:bg-primary/15"}`}>
                          {repeat === "one" ? <Repeat1 size={24} /> : <Repeat size={24} />}
                          {repeat !== "off" && <span className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p>{getRepeatLabel()}</p></TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </motion.div>

              <div className="h-16 lg:h-0" />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </TooltipProvider>
  )
}