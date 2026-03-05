"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion"
import { X, ChevronDown, Music, AudioLinesIcon, Eye, Video, VideoOff } from "lucide-react"
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

  const videoPlayerRef = useRef<any>(null)
  const videoReadyRef = useRef(false)
  const initialSyncDoneRef = useRef(false)

  const y = useMotionValue(0)
  const opacity = useTransform(y, [0, 300], [1, 0])
  const scale = useTransform(y, [0, 300], [1, 0.95])

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

  useEffect(() => {
    if (!videoReadyRef.current || initialSyncDoneRef.current || !videoPlayerRef.current) return
    initialSyncDoneRef.current = true
    videoPlayerRef.current.seekTo(currentTime, true)
    if (isPlaying) videoPlayerRef.current.playVideo()
    else videoPlayerRef.current.pauseVideo()
  })

  useEffect(() => {
    if (!videoPlayerRef.current || !videoReadyRef.current) return
    if (isPlaying) videoPlayerRef.current.playVideo()
    else videoPlayerRef.current.pauseVideo()
  }, [isPlaying])

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
      {/* Backdrop */}
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

      {/* Visualizer */}
      {showVisualizer && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <SimpleVisualizer isPlaying={isPlaying} currentTime={currentTime} volume={volume} bpm={128} />
        </div>
      )}

      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/20 via-black/25 to-black/55 pointer-events-none" />

      {/* Draggable panel */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        style={{ y, opacity, scale }}
        className="relative h-full w-full flex flex-col z-20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header – bigger buttons on mobile */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3 md:px-8 md:pt-6 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onExpandChange(false)}
            className="text-white/70 hover:text-white hover:bg-white/10 rounded-full h-11 w-11 md:h-10 md:w-10 transition-all"
          >
            <ChevronDown size={28} className="md:size-24" />
          </Button>

          <p className="text-sm font-semibold uppercase tracking-widest text-white/50 select-none">
            Now Playing
          </p>

          <div className="flex items-center gap-2 md:gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowVideo((v) => !v)}
              disabled={!currentTrack}
              className={`rounded-full h-11 w-11 md:h-10 md:w-10 transition-all text-xl md:text-base ${
                showVideo
                  ? "text-primary bg-primary/25 hover:bg-primary/40"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
              title={showVideo ? "Hide Video" : "Show Video"}
            >
              {showVideo ? <VideoOff size={24} className="md:size-20" /> : <Video size={24} className="md:size-20" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowVisualizer((v) => !v)}
              className={`rounded-full h-11 w-11 md:h-10 md:w-10 transition-all text-xl md:text-base ${
                showVisualizer
                  ? "text-primary bg-primary/25 hover:bg-primary/40"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
              title={showVisualizer ? "Hide Visualizer" : "Show Visualizer"}
            >
              <AudioLinesIcon size={24} className="md:size-20" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onExpandChange(false)}
              className="text-white/60 hover:text-white hover:bg-white/10 rounded-full h-11 w-11 md:h-10 md:w-10 transition-all"
            >
              <X size={24} className="md:size-20" />
            </Button>
          </div>
        </div>

        {/* Mobile drag handle */}
        <div className="flex justify-center mb-2 lg:hidden">
          <div className="drag-handle h-1.5 w-10 bg-white/30 rounded-full" />
        </div>

        {/* ── Main content ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col lg:flex-row items-center lg:items-center justify-center gap-6 lg:gap-16 xl:gap-20 px-5 sm:px-8 md:px-12 lg:px-16 xl:px-24 pb-8 lg:pb-0 overflow-y-auto">

          {/* Artwork / Video – much bigger on desktop */}
          <div className="flex-shrink-0 flex items-center justify-center w-full max-w-md lg:max-w-2xl xl:max-w-3xl">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45, ease: [0.34, 1.18, 0.64, 1] }}
              className={[
                "relative overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10 bg-black",
                showVideo
                  ? "w-full aspect-video"
                  : "w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 lg:w-[420px] lg:h-[420px] xl:w-[520px] xl:h-[520px]",
              ].join(" ")}
            >
              {showVideo ? (
                <div id="expanded-yt-video" className="w-full h-full" />
              ) : currentTrack?.thumbnail ? (
                <>
                  <Image
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title || "Album art"}
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/25 pointer-events-none" />
                </>
              ) : (
                <div className="w-full h-full bg-zinc-900/80 flex items-center justify-center">
                  <Music size={72} className="text-zinc-600" />
                </div>
              )}
            </motion.div>
          </div>

          {/* Track info + controls */}
          <div className="flex flex-col items-center lg:items-start w-full lg:w-auto lg:max-w-md xl:max-w-lg gap-6 lg:gap-8 mt-4 lg:mt-0">
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="text-center lg:text-left w-full max-w-md"
            >
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-3xl xl:text-4xl font-bold text-white leading-tight line-clamp-2 mb-2">
                {currentTrack?.title || "No Track Playing"}
              </h1>
              <p className="text-base sm:text-lg md:text-xl lg:text-lg xl:text-xl text-white/60 font-medium line-clamp-1">
                {currentTrack?.artist || "Unknown Artist"}
              </p>
            </motion.div>

            <div className="hidden lg:block h-px bg-white/10 w-full max-w-xs" />

            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="w-full"
            >
              {children}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
