"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion"
import { X, ChevronDown, Music, Eye, EyeOff, Video, VideoOff } from "lucide-react"
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
}

export function ExpandablePlayer({
  isExpanded,
  onExpandChange,
  currentTime,
  isPlaying,
  volume = 1,
  children,
}: ExpandablePlayerProps) {
  const { currentTrack } = useApp()
  const [showVisualizer, setShowVisualizer] = useState(false)
  const [showVideo, setShowVideo] = useState(false)

  // ── Expanded-player-local YouTube instance ────────────────────────────────
  const expandedPlayerRef = useRef<any>(null)
  const expandedPlayerReadyRef = useRef(false)
  const hasSyncedRef = useRef(false)

  const y = useMotionValue(0)
  const opacity = useTransform(y, [0, 300], [1, 0])
  const scale = useTransform(y, [0, 300], [1, 0.95])

  // ── Reset state when closed ───────────────────────────────────────────────
  useEffect(() => {
    if (!isExpanded) {
      y.set(0)
      setShowVisualizer(false)
      // Destroy local video player when panel closes
      if (expandedPlayerRef.current?.destroy) {
        expandedPlayerRef.current.destroy()
        expandedPlayerRef.current = null
        expandedPlayerReadyRef.current = false
        hasSyncedRef.current = false
      }
    }
  }, [isExpanded, y])

  // ── Init / destroy expanded YT player when video is toggled ──────────────
  useEffect(() => {
    if (!isExpanded || !showVideo || !currentTrack?.id) return

    const init = () => {
      if (!window.YT?.Player) return
      if (expandedPlayerRef.current) return // already created

      expandedPlayerRef.current = new window.YT.Player("expanded-yt-player", {
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
            expandedPlayerReadyRef.current = true
            hasSyncedRef.current = false
          },
        },
      })
    }

    if (window.YT?.Player) {
      init()
    } else {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prev?.()
        init()
      }
    }

    return () => {
      if (expandedPlayerRef.current?.destroy) {
        expandedPlayerRef.current.destroy()
        expandedPlayerRef.current = null
        expandedPlayerReadyRef.current = false
        hasSyncedRef.current = false
      }
    }
  }, [isExpanded, showVideo, currentTrack?.id])

  // ── Sync expanded player to main player's position once on ready ──────────
  useEffect(() => {
    if (!expandedPlayerReadyRef.current || hasSyncedRef.current) return
    if (!expandedPlayerRef.current) return

    hasSyncedRef.current = true

    // Seek to current position
    expandedPlayerRef.current.seekTo(currentTime, true)

    // Mirror play state
    if (isPlaying) {
      expandedPlayerRef.current.playVideo()
    } else {
      expandedPlayerRef.current.pauseVideo()
    }
  })

  // ── Keep expanded player in sync with main play/pause ────────────────────
  useEffect(() => {
    if (!expandedPlayerRef.current || !expandedPlayerReadyRef.current) return
    if (isPlaying) {
      expandedPlayerRef.current.playVideo()
    } else {
      expandedPlayerRef.current.pauseVideo()
    }
  }, [isPlaying])

  // ── When video is turned off, destroy the local player ───────────────────
  useEffect(() => {
    if (!showVideo && expandedPlayerRef.current?.destroy) {
      expandedPlayerRef.current.destroy()
      expandedPlayerRef.current = null
      expandedPlayerReadyRef.current = false
      hasSyncedRef.current = false
    }
  }, [showVideo])

  const handleDragEnd = useCallback((_event: any, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) {
      onExpandChange(false)
    } else {
      y.set(0)
    }
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
      {/* ── Album-art blur backdrop ────────────────────────────────────────── */}
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

      {/* ── Visualizer ────────────────────────────────────────────────────── */}
      {showVisualizer && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <SimpleVisualizer isPlaying={isPlaying} currentTime={currentTime} volume={volume} bpm={128} />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/20 via-black/25 to-black/55 pointer-events-none" />

      {/* ── Draggable panel ───────────────────────────────────────────────── */}
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
            {/* Video toggle — lives here only, not in PlayerControls */}
            <Button
              variant="ghost" size="icon"
              onClick={() => setShowVideo(!showVideo)}
              className={`rounded-full h-10 w-10 transition-all ${
                showVideo
                  ? "text-primary bg-primary/20 hover:bg-primary/30"
                  : "text-white/45 hover:text-white hover:bg-white/10"
              }`}
              title={showVideo ? "Hide Video" : "Show Video"}
              disabled={!currentTrack}
            >
              {showVideo ? <VideoOff size={18} /> : <Video size={18} />}
            </Button>

            <Button
              variant="ghost" size="icon"
              onClick={() => setShowVisualizer(!showVisualizer)}
              className={`rounded-full h-10 w-10 transition-all ${
                showVisualizer
                  ? "text-primary bg-primary/20 hover:bg-primary/30"
                  : "text-white/45 hover:text-white hover:bg-white/10"
              }`}
              title={showVisualizer ? "Hide Visualizer" : "Show Visualizer"}
            >
              {showVisualizer ? <EyeOff size={18} /> : <Eye size={18} />}
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
        <div className="flex justify-center mb-1 lg:hidden">
          <div className="drag-handle" />
        </div>

        {/* ── Main layout ─────────────────────────────────────────────────
            Mobile (<lg) : vertical stack  — art/video → info → controls
            Desktop (≥lg): horizontal row  — art/video | info + controls
        ────────────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col lg:flex-row items-center lg:items-center justify-start lg:justify-center gap-6 lg:gap-14 px-5 md:px-10 lg:px-16 xl:px-20 pb-6 overflow-y-auto min-h-0">

          {/* ── LEFT / TOP: artwork or video ──────────────────────────── */}
          <div className="flex-shrink-0 flex items-center justify-center w-full lg:w-auto">
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.42, ease: [0.34, 1.18, 0.64, 1] }}
              className={[
                "relative overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10",
                showVideo
                  ? "w-full max-w-xs sm:max-w-sm lg:max-w-md xl:max-w-lg aspect-video"
                  : "w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 lg:w-64 lg:h-64 xl:w-80 xl:h-80",
              ].join(" ")}
            >
              {showVideo ? (
                /* Self-contained expanded YT player — completely separate from
                   the hidden audio player in PlayerControls. Controls (play/pause/
                   seek) are mirrored to this instance via the effects above. */
                <div className="w-full h-full bg-black">
                  <div id="expanded-yt-player" className="w-full h-full" />
                </div>
              ) : currentTrack?.thumbnail ? (
                <>
                  <Image
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title || "Album art"}
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20 pointer-events-none" />
                </>
              ) : (
                <div className="w-full h-full bg-zinc-800/80 flex items-center justify-center">
                  <Music size={56} className="text-zinc-600" />
                </div>
              )}
            </motion.div>
          </div>

          {/* ── RIGHT / BOTTOM: track info + controls ─────────────────── */}
          <div className="flex flex-col justify-center w-full lg:max-w-sm xl:max-w-md gap-5">

            <motion.div
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.38, delay: 0.08 }}
              className="text-center lg:text-left"
            >
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-2xl xl:text-3xl font-bold text-white leading-snug line-clamp-2 mb-1">
                {currentTrack?.title || "No Track Playing"}
              </h1>
              <p className="text-sm md:text-base text-white/55 font-medium line-clamp-1">
                {currentTrack?.artist || "Unknown Artist"}
              </p>
            </motion.div>

            <div className="hidden lg:block h-px bg-white/10 w-full" />

            <motion.div
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.38, delay: 0.15 }}
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
