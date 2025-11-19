"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion"
import { X, ChevronDown, Type, Video, Music } from 'lucide-react'
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { LyricsDisplay } from "./LyricsDisplay"
import { useApp } from "@/contexts/AppContext"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
  const { currentTrack } = useApp()
  const [showLyrics, setShowLyrics] = useState(false)
  const [expandedVideoMode, setExpandedVideoMode] = useState(false)
  const y = useMotionValue(0)
  const opacity = useTransform(y, [0, 300], [1, 0])
  const scale = useTransform(y, [0, 300], [1, 0.8])

  useEffect(() => {
    if (!isExpanded) {
      y.set(0)
      setShowLyrics(false)
      setExpandedVideoMode(false)
    }
  }, [isExpanded, y])

  const handleBackdropClick = () => {
    if (window.innerWidth >= 768) {
      onExpandChange(false)
    }
  }

  const handleDragEnd = (_event: any, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onExpandChange(false)
    } else {
      y.set(0)
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
          {expandedVideoMode && currentTrack ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative w-full max-w-md aspect-video mb-6 md:mb-8 bg-black rounded-xl overflow-hidden shadow-2xl"
              id="expanded-youtube-container"
            >
              {/* YouTube iframe will be moved here via CSS */}
            </motion.div>
          ) : currentTrack?.thumbnail ? (
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

          {currentTrack && (
            <div className="mb-6 flex gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className={`bg-white/10 border-white/20 text-white hover:bg-white/20 ${expandedVideoMode ? 'bg-white/20' : ''}`}
                      onClick={() => setExpandedVideoMode(!expandedVideoMode)}
                    >
                      {expandedVideoMode ? <Music size={20} className="mr-2" /> : <Video size={20} className="mr-2" />}
                      {expandedVideoMode ? "Hide Video" : "Show Video"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{expandedVideoMode ? "Switch to album art" : "Show video player"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

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

      <style jsx global>{`
        ${expandedVideoMode && isExpanded ? `
          #youtube-player {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            z-index: 9999 !important;
          }
          
          #expanded-youtube-container {
            position: relative;
          }
          
          #youtube-player > * {
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            max-width: 640px !important;
            max-height: 360px !important;
            width: 90% !important;
            height: auto !important;
            aspect-ratio: 16/9 !important;
          }
        ` : ''}
      `}</style>
    </motion.div>
  )
}
