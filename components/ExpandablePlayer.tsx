"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion"
import { X, ChevronDown, Type } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { LyricsDisplay } from "./LyricsDisplay"
import { useApp } from "@/contexts/AppContext"

interface ExpandablePlayerProps {
  isExpanded: boolean
  onExpandChange: (expanded: boolean) => void
  currentTime: number
  isPlaying: boolean
  children?: React.ReactNode
}

export function ExpandablePlayer({
  isExpanded,
  onExpandChange,
  currentTime,
  isPlaying,
  children,
}: ExpandablePlayerProps) {
  const { currentTrack, videoMode } = useApp()
  const [showLyrics, setShowLyrics] = useState(false)
  const [localVideoMode, setLocalVideoMode] = useState(false)
  const y = useMotionValue(0)
  const opacity = useTransform(y, [0, 300], [1, 0])
  const scale = useTransform(y, [0, 300], [1, 0.8])
  const expandedPlayerRef = useRef<any>(null)
  const isPlayerReadyRef = useRef(false)

  // Initialize YouTube player for expanded view
  useEffect(() => {
    if (!isExpanded || !localVideoMode || !currentTrack?.id) return

    const initExpandedPlayer = () => {
      if (window.YT && window.YT.Player && !expandedPlayerRef.current) {
        expandedPlayerRef.current = new window.YT.Player("expanded-youtube-player", {
          height: "100%",
          width: "100%",
          videoId: currentTrack.id,
          playerVars: {
            autoplay: 0,
            controls: 1,
            disablekb: 0,
            fs: 1,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            iv_load_policy: 3,
          },
          events: {
            onReady: () => {
              isPlayerReadyRef.current = true
              console.log("[ExpandedPlayer] Player ready")
            },
          },
        })
      }
    }

    if (window.YT && window.YT.Player) {
      initExpandedPlayer()
    } else {
      const checkYT = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkYT)
          initExpandedPlayer()
        }
      }, 100)

      return () => clearInterval(checkYT)
    }

    return () => {
      if (expandedPlayerRef.current && typeof expandedPlayerRef.current.destroy === "function") {
        expandedPlayerRef.current.destroy()
        expandedPlayerRef.current = null
        isPlayerReadyRef.current = false
      }
    }
  }, [isExpanded, localVideoMode, currentTrack?.id])

  // Sync playback state with expanded player
  useEffect(() => {
    if (!expandedPlayerRef.current || !isPlayerReadyRef.current) return

    if (isPlaying) {
      expandedPlayerRef.current.playVideo?.()
    } else {
      expandedPlayerRef.current.pauseVideo?.()
    }
  }, [isPlaying])

  // Seek to current position when video mode is toggled
  useEffect(() => {
    if (expandedPlayerRef.current && isPlayerReadyRef.current && localVideoMode) {
      setTimeout(() => {
        expandedPlayerRef.current.seekTo?.(currentTime, true)
        if (isPlaying) {
          expandedPlayerRef.current.playVideo?.()
        }
      }, 500)
    }
  }, [localVideoMode])

  const handleDragEnd = (_event: any, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onExpandChange(false)
    } else {
      y.set(0)
    }
  }

  useEffect(() => {
    if (!isExpanded) {
      y.set(0)
      setShowLyrics(false)
      setLocalVideoMode(false)
    } else {
      setLocalVideoMode(videoMode)
    }
  }, [isExpanded, y, videoMode])

  // Desktop: Click to toggle
  const handleBackdropClick = () => {
    if (window.innerWidth >= 768) {
      onExpandChange(false)
    }
  }

  if (!isExpanded) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md"
      onClick={handleBackdropClick}
    >
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ y, opacity, scale }}
        className="relative h-full w-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onExpandChange(false)}
            className="text-white/80 hover:text-white"
          >
            <ChevronDown size={28} />
          </Button>
          <p className="text-sm text-white/60">Now Playing</p>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onExpandChange(false)}
            className="text-white/80 hover:text-white"
          >
            <X size={24} />
          </Button>
        </div>

        {/* Drag indicator */}
        <div className="flex justify-center mb-4 md:hidden">
          <div className="w-12 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-start px-6 md:px-12 overflow-hidden">
          {/* Album Art */}
          {currentTrack?.thumbnail ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative w-full max-w-md aspect-square mb-6 md:mb-8"
            >
              <Image
                src={currentTrack.thumbnail || "/placeholder.svg"}
                alt={currentTrack.title}
                fill
                className="rounded-xl object-cover shadow-2xl"
                priority
              />
            </motion.div>
          ) : (
            <div className="w-full max-w-md aspect-square mb-6 md:mb-8 bg-secondary rounded-xl flex items-center justify-center shadow-2xl">
              <span className="text-9xl text-muted-foreground">♪</span>
            </div>
          )}

          {/* Track Info */}
          <div className="w-full max-w-2xl text-center mb-6">
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 line-clamp-2">
              {currentTrack?.title || "No Track Playing"}
            </h1>
            <p className="text-lg md:text-xl text-white/60">{currentTrack?.artist || "Unknown Artist"}</p>
          </div>

          {/* Lyrics Button - ONLY IN EXPANDED VIEW */}
          {currentTrack && (
            <div className="mb-6">
              <Sheet open={showLyrics} onOpenChange={setShowLyrics}>
                <Button
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={() => setShowLyrics(true)}
                >
                  <Type size={20} className="mr-2" />
                  View Lyrics
                </Button>
                <SheetContent side="right" className="w-full sm:w-96 bg-black/95 border-white/10">
                  <SheetHeader>
                    <SheetTitle className="text-white">Lyrics</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 h-[calc(100vh-8rem)]">
                    <LyricsDisplay currentTime={currentTime} isPlaying={isPlaying} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}

          {/* Player Controls */}
          <div className="w-full max-w-2xl">{children}</div>
        </div>
      </motion.div>
    </motion.div>
  )
}
