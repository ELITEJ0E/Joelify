"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion"
import { X, ChevronDown, Music, Image as ImageIcon, Eye, EyeOff } from "lucide-react"
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

/**
 * Re-parents the YouTube iframe container into a slot div (or back) without
 * destroying the IFrame API player instance.  We locate the inner managed div
 * (first child of #yt-player-root) and move it between parents.
 */
function useYouTubeIframeSlot(isExpanded: boolean, videoMode: boolean) {
  const slotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isExpanded || !videoMode) return

    const root = document.getElementById("yt-player-root")
    const playerEl = root?.firstElementChild as HTMLElement | null
    const slot = slotRef.current

    if (!playerEl || !slot) return

    const originalParent = playerEl.parentElement
    if (!originalParent || originalParent === slot) return

    // Snapshot inline styles we're about to override
    const prev = {
      display: playerEl.style.display,
      maxWidth: playerEl.style.maxWidth,
      maxHeight: playerEl.style.maxHeight,
      width: playerEl.style.width,
      height: playerEl.style.height,
      margin: playerEl.style.margin,
    }

    // Move into slot and make fully visible
    playerEl.style.display = "flex"
    playerEl.style.maxWidth = "100%"
    playerEl.style.maxHeight = "100%"
    playerEl.style.width = "100%"
    playerEl.style.height = "100%"
    playerEl.style.margin = "0"
    slot.appendChild(playerEl)

    return () => {
      // Restore element to its original home
      if (originalParent && playerEl) {
        Object.assign(playerEl.style, prev)
        originalParent.appendChild(playerEl)
      }
    }
  }, [isExpanded, videoMode])

  return slotRef
}

export function ExpandablePlayer({
  isExpanded,
  onExpandChange,
  currentTime,
  isPlaying,
  volume = 1,
  children,
}: ExpandablePlayerProps) {
  const { currentTrack, videoMode } = useApp()
  const [showVisualizer, setShowVisualizer] = useState(false)
  const y = useMotionValue(0)
  const opacity = useTransform(y, [0, 300], [1, 0])
  const scale = useTransform(y, [0, 300], [1, 0.95])

  // Shared iframe slot ref
  const videoSlotRef = useYouTubeIframeSlot(isExpanded, videoMode)

  useEffect(() => {
    if (!isExpanded) {
      y.set(0)
      setShowVisualizer(false)
    }
  }, [isExpanded, y])

  const handleDragEnd = useCallback((_event: any, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) {
      onExpandChange(false)
    } else {
      y.set(0)
    }
  }, [onExpandChange, y])

  const handleBackdropClick = useCallback(() => {
    // Only close on desktop backdrop click
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
      {/* ── Dynamic background ──────────────────────────────────────────── */}
      {/* Album-art blur backdrop */}
      {currentTrack?.thumbnail && !showVisualizer && (
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${currentTrack.thumbnail})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(40px) brightness(0.25) saturate(1.4)",
            transform: "scale(1.15)",
          }}
        />
      )}

      {/* Solid dark fallback */}
      <div className="absolute inset-0 z-0 bg-zinc-950" style={{ opacity: currentTrack?.thumbnail && !showVisualizer ? 0 : 1 }} />

      {/* Visualizer */}
      {showVisualizer && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <SimpleVisualizer
            isPlaying={isPlaying}
            currentTime={currentTime}
            volume={volume}
            bpm={128}
          />
        </div>
      )}

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/20 via-black/30 to-black/60 pointer-events-none" />

      {/* ── Draggable content panel ────────────────────────────────────── */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        style={{ y, opacity, scale }}
        className="relative h-full w-full flex flex-col z-20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 md:px-8 md:pt-6 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onExpandChange(false)}
            className="text-white/70 hover:text-white hover:bg-white/10 rounded-full h-10 w-10 transition-all"
          >
            <ChevronDown size={24} />
          </Button>

          <div className="flex flex-col items-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Now Playing</p>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowVisualizer(!showVisualizer)}
              className={`rounded-full h-10 w-10 transition-all ${
                showVisualizer
                  ? "text-primary bg-primary/20 hover:bg-primary/30"
                  : "text-white/50 hover:text-white hover:bg-white/10"
              }`}
              title={showVisualizer ? "Hide Visualizer" : "Show Visualizer"}
            >
              {showVisualizer ? <EyeOff size={18} /> : <Eye size={18} />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onExpandChange(false)}
              className="text-white/50 hover:text-white hover:bg-white/10 rounded-full h-10 w-10 transition-all"
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* Mobile drag handle */}
        <div className="flex justify-center mb-2 lg:hidden">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* ── Main content area ────────────────────────────────────────── */}
        {/*
          Mobile  (<lg): stacked column — thumbnail → info → controls
          Desktop (≥lg): side-by-side row — left: thumbnail | right: info+controls
        */}
        <div className="flex-1 flex flex-col lg:flex-row items-center lg:items-stretch justify-start lg:justify-center gap-6 lg:gap-12 px-5 md:px-10 lg:px-16 pb-6 overflow-y-auto min-h-0">

          {/* ── LEFT: Album art / video thumbnail ─────────────────────── */}
          <div className="flex-shrink-0 flex items-center justify-center w-full lg:w-auto">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className={`
                relative overflow-hidden rounded-2xl shadow-2xl
                ${videoMode
                  ? "w-full max-w-sm lg:max-w-md xl:max-w-lg aspect-video"
                  : "w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 lg:w-72 lg:h-72 xl:w-80 xl:h-80"
                }
              `}
            >
              {videoMode ? (
                /* ── Video slot: shared YT iframe is DOM-re-parented here ── */
                <div
                  ref={videoSlotRef}
                  id="expanded-video-slot"
                  className="w-full h-full bg-black"
                  style={{ aspectRatio: "16/9" }}
                />
              ) : currentTrack?.thumbnail ? (
                <>
                  <Image
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title || "Album art"}
                    fill
                    className="object-cover"
                    priority
                  />
                  {/* Subtle vinyl-record shine */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20 pointer-events-none" />
                </>
              ) : (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                  <Music size={64} className="text-zinc-600" />
                </div>
              )}
            </motion.div>
          </div>

          {/* ── RIGHT: Track info + controls ──────────────────────────── */}
          <div className="flex flex-col justify-center w-full lg:max-w-md xl:max-w-lg gap-4">
            {/* Track name + artist */}
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="text-center lg:text-left"
            >
              <h1 className="text-2xl md:text-3xl lg:text-3xl xl:text-4xl font-bold text-white leading-tight line-clamp-2 mb-1">
                {currentTrack?.title || "No Track Playing"}
              </h1>
              <p className="text-base md:text-lg text-white/60 font-medium line-clamp-1">
                {currentTrack?.artist || "Unknown Artist"}
              </p>
            </motion.div>

            {/* Thin separator */}
            <div className="hidden lg:block h-px bg-white/10 w-full" />

            {/* Injected controls (progress bar + buttons from PlayerControls) */}
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.18 }}
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
