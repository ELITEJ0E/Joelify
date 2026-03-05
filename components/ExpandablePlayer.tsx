"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion"
import { X, ChevronDown, Music, AudioLinesIcon, Video, VideoOff } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { SimpleVisualizer } from "./SimpleVisualizer"
import { useApp } from "@/contexts/AppContext"

interface ExpandablePlayerProps {
  isExpanded: boolean
  onExpandChange: (expanded: boolean) => void
  currentTime: number
  isPlaying: boolean
  volume?: number
  children?: React.ReactNode
  /** Called with true when video player takes over audio, false when it releases */
  onVideoActiveChange?: (videoActive: boolean) => void
}

export function ExpandablePlayer({
  isExpanded,
  onExpandChange,
  currentTime,
  isPlaying,
  volume = 1,
  children,
  onVideoActiveChange,
}: ExpandablePlayerProps) {
  const { currentTrack } = useApp()
  const [showVisualizer, setShowVisualizer] = useState(false)
  const [showVideo, setShowVideo] = useState(false)

  // ── Local video YT instance ────────
  const videoPlayerRef = useRef<any>(null)
  const videoReadyRef = useRef(false)
  const initialSyncDoneRef = useRef(false)

  const y = useMotionValue(0)
  const opacity = useTransform(y, [0, 300], [1, 0])
  const scale = useTransform(y, [0, 300], [1, 0.95])

  // ── Destroy video player and reset state on close ─────────────────────────
  useEffect(() => {
    if (!isExpanded) {
      y.set(0)
      setShowVisualizer(false)
      setShowVideo(false)
      destroyVideoPlayer()
    }
  }, [isExpanded, y])

  const destroyVideoPlayer = () => {
    if (videoPlayerRef.current?.destroy) {
      videoPlayerRef.current.destroy()
    }
    videoPlayerRef.current = null
    videoReadyRef.current = false
    initialSyncDoneRef.current = false
    onVideoActiveChange?.(false)
  }

  // ── Init video player when showVideo becomes true ──────────────────────────
  useEffect(() => {
    if (!isExpanded || !showVideo || !currentTrack?.id) return

    const timer = setTimeout(() => {
      if (!window.YT?.Player || videoPlayerRef.current) return

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
    videoPlayerRef.current.seekTo(currentTime, true)
    if (isPlaying) videoPlayerRef.current.playVideo()
    else videoPlayerRef.current.pauseVideo()
  })

  // ── Keep video in sync ───────────────────────────────
  useEffect(() => {
    if (!videoPlayerRef.current || !videoReadyRef.current) return
    if (isPlaying) videoPlayerRef.current.playVideo()
    else videoPlayerRef.current.pauseVideo()
  }, [isPlaying])

  // ── Destroy video player when toggled off ─────────────────────────────────
  useEffect(() => {
    if (!showVideo) destroyVideoPlayer()
  }, [showVideo])

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onExpandChange(false)
    else y.set(0)
  }, [onExpandChange, y])

  const handleBackdropClick = useCallback(() => {
    if (window.innerWidth >= 1024) onExpandChange(false)
  }, [onExpandChange])

  if (!isExpanded) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 overflow-hidden"
      onClick={handleBackdropClick}
    >
      {/* ── Album-art blur backdrop ──────────────────────────────────────── */}
      {currentTrack?.thumbnail && !showVisualizer && (
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${currentTrack.thumbnail})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(40px) brightness(0.22) saturate(1.5)",
            transform: "scale(1.15)",
          }}
        />
      )}
      <div className="absolute inset-0 z-0 bg-zinc-950" />

      {/* ── Visualizer ──────────────────────────────────────────────────── */}
      {showVisualizer && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <SimpleVisualizer isPlaying={isPlaying} currentTime={currentTime} volume={volume} bpm={128} />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/20 via-black/25 to-black/55 pointer-events-none" />

      {/* ── Draggable panel ─────────────────────────────────────────────── */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        style={{ y, opacity, scale }}
        className="relative h-full w-full flex flex-col z-20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 md:px-8 md:pt-5 flex-shrink-0">
          <Button
            variant="ghost" size="icon"
            onClick={() => onExpandChange(false)}
            className="text-white/60 hover:text-white hover:bg-white/10 rounded-full h-10 w-10 transition-all"
          >
            <ChevronDown size={24} />
          </Button>

          <p className="text-xs font-semibold uppercase tracking-widest text-white/45 select-none">
            Now Playing
          </p>

          <div className="flex items-center gap-1">
            {/* Video toggle */}
            <Button
              variant="ghost" size="icon"
              onClick={() => setShowVideo((v) => !v)}
              disabled={!currentTrack}
              className={`rounded-full h-10 w-10 transition-all ${
                showVideo
                  ? "text-primary bg-primary/20 hover:bg-primary/30"
                  : "text-white/45 hover:text-white hover:bg-white/10"
              }`}
              title={showVideo ? "Hide Video" : "Show Video"}
            >
              {showVideo ? <VideoOff size={18} /> : <Video size={18} />}
            </Button>

            <Button
              variant="ghost" size="icon"
              onClick={() => setShowVisualizer((v) => !v)}
              className={`rounded-full h-10 w-10 transition-all ${
                showVisualizer
                  ? "text-primary bg-primary/20 hover:bg-primary/30"
                  : "text-white/45 hover:text-white hover:bg-white/10"
              }`}
              title={showVisualizer ? "Hide Visualizer" : "Show Visualizer"}
            >
              <AudioLinesIcon size={18} />
            </Button>

            <Button
              variant="ghost" size="icon"
              onClick={() => onExpandChange(false)}
              className="text-white/45 hover:text-white hover:bg-white/10 rounded-full h-10 w-10 transition-all"
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* Mobile drag handle */}
        <div className="flex justify-center mb-2 lg:hidden">
          <div className="w-12 h-1 bg-white/20 rounded-full" />
        </div>

        {/* ── Main content with responsive layout ───────────────────── */}
        {/* Mobile: vertical stack | Desktop: horizontal split */}
        <div className="flex-1 flex flex-col lg:flex-row lg:items-center lg:justify-center lg:gap-12 xl:gap-16 px-4 md:px-8 lg:px-12 pb-6 overflow-y-auto">
          
          {/* ── LEFT: Media container ───────────────────────────────── */}
          <div className="flex justify-center lg:flex-1 lg:justify-end">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center"
            >
              <div
                className={[
                  "relative overflow-hidden rounded-xl shadow-2xl",
                  // Mobile sizing
                  showVideo
                    ? "w-full max-w-md aspect-video" // Video on mobile
                    : "w-64 h-64 sm:w-72 sm:h-72", // Artwork on mobile
                  // Desktop sizing - slightly larger
                  "lg:max-w-none lg:w-80 lg:h-80 lg:rounded-2xl",
                  showVideo && "lg:w-[32rem] lg:h-[18rem] xl:w-[40rem] xl:h-[22.5rem] lg:rounded-2xl",
                ].join(" ")}
              >
                {showVideo ? (
                  <div className="w-full h-full bg-black rounded-xl lg:rounded-2xl overflow-hidden">
                    <div id="expanded-yt-video" className="w-full h-full" />
                  </div>
                ) : currentTrack?.thumbnail ? (
                  <Image
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title || "Album art"}
                    fill
                    className="object-cover rounded-xl lg:rounded-2xl"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800/80 rounded-xl lg:rounded-2xl flex items-center justify-center">
                    <Music size={56} className="text-zinc-600" />
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* ── RIGHT: Track info + controls ────────────────────────── */}
          <div className="lg:flex-1 lg:max-w-md xl:max-w-lg mt-6 lg:mt-0">
            {/* Track info - centered on mobile, left-aligned on desktop */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="text-center lg:text-left mb-6"
            >
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 line-clamp-2">
                {currentTrack?.title || "No Track Playing"}
              </h1>
              <p className="text-base md:text-lg text-white/60">
                {currentTrack?.artist || "Unknown Artist"}
              </p>
            </motion.div>

            {/* Desktop divider */}
            <div className="hidden lg:block h-px bg-white/10 w-full mb-6" />

            {/* Controls container with smaller play/pause buttons */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="w-full"
            >
              {/* We need to modify the play/pause button size in the children */}
              {/* The children (PlayerControls) will need to accept a size prop or we can wrap and override */}
              <div className="[&_.play-pause-button]:w-10 [&_.play-pause-button]:h-10 [&_.play-pause-button]:sm:w-12 [&_.play-pause-button]:sm:h-12">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
