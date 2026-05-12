"use client"

import { useState, useEffect, useRef } from "react"
import { Music2, RefreshCcw, RefreshCcwDot, ArrowDown } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { useApp } from "@/contexts/AppContext"
import { useLyrics, parseLrc } from "@/hooks/useLyrics"

interface LyricsDisplayProps {
  currentTime: number
  isPlaying: boolean
  duration?: number
}

export function LyricsDisplay({ currentTime, isPlaying, duration }: LyricsDisplayProps) {
  const { currentTrack } = useApp()
  const { lyrics: fetchedLyrics, isLoading, error } = useLyrics(currentTrack?.title, currentTrack?.artist, currentTrack?.id)
  
  const activeLyrics = fetchedLyrics && fetchedLyrics.length > 0 
    ? fetchedLyrics 
    : currentTrack?.lyrics 
      ? parseLrc(currentTrack.lyrics)
      : null;

  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [isAutoScroll, setIsAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])
  const isProgrammaticScroll = useRef(false)

  useEffect(() => {
    if (!activeLyrics || activeLyrics.length === 0) return
    if (!isAutoScroll) return // Do not sync with audio if auto-scroll is off

    const isUnsynced = !activeLyrics.some((line) => line.time !== -1 && line.text !== "");
    if (isUnsynced) {
      if (duration && duration > 0) {
        let pct = currentTime / duration;
        if (pct < 0) pct = 0;
        if (pct > 1) pct = 1;
        const newIndex = Math.floor(pct * activeLyrics.length);
        if (newIndex !== currentLineIndex && newIndex < activeLyrics.length) {
          setCurrentLineIndex(newIndex);
        }
      }
      return;
    }

    // For synced lyrics, we need to handle lines that might not have timestamps (time === -1)
    // We do this by finding the last valid line whose time is <= currentTime
    let newIndex = -1;
    for (let i = 0; i < activeLyrics.length; i++) {
        if (activeLyrics[i].time !== -1 && currentTime >= activeLyrics[i].time) {
            newIndex = i;
        }
    }

    if (newIndex !== -1 && newIndex !== currentLineIndex) {
      setCurrentLineIndex(newIndex)
    }
  }, [currentTime, duration, activeLyrics, currentLineIndex, isAutoScroll])

  useEffect(() => {
    if (isAutoScroll) return;
    
    const viewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') || null;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
            const index = lineRefs.current.findIndex(el => el === entry.target);
            if (index !== -1 && lineRefs.current[index]?.textContent?.trim()) {
                setCurrentLineIndex(index);
            }
        }
      });
    }, {
      root: viewport,
      rootMargin: '-50% 0px -50% 0px', 
      threshold: 0
    });
    
    lineRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });
    
    return () => observer.disconnect();
  }, [isAutoScroll, activeLyrics]);

  useEffect(() => {
    if (!isAutoScroll) return;
    if (lineRefs.current[currentLineIndex] && scrollRef.current) {
      isProgrammaticScroll.current = true;
      lineRefs.current[currentLineIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 500); 
    }
  }, [currentLineIndex, isAutoScroll])

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <Music2 size={48} className="mb-4 opacity-50" />
        <p className="text-sm">No track playing</p>
        <p className="text-xs mt-1">Play a song to see lyrics</p>
      </div>
    )
  }

  if (isLoading && !activeLyrics) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
        <p className="text-sm">Loading lyrics...</p>
      </div>
    )
  }

  if (!activeLyrics || activeLyrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <Music2 size={48} className="mb-4 opacity-50" />
        <p className="text-sm">{error || "No lyrics available"}</p>
        <p className="text-xs mt-1">for {currentTrack.title}</p>
      </div>
    )
  }

  const isUnsynced = !activeLyrics.some((line) => line.time !== -1 && line.text !== "");

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden bg-background">
      <div className="absolute inset-0 z-0 animate-gradient-move bg-gradient-to-br from-background via-secondary/30 to-background opacity-50"></div>
      
      <div className="fixed top-[18px] right-12 z-[60]">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsAutoScroll(!isAutoScroll)}
          className={`h-6 px-2 text-xs transition-all ${isAutoScroll ? "text-primary" : "text-zinc-500 hover:text-white"}`}
        >
          {isAutoScroll ? <RefreshCcw className="w-3 h-3 mr-1" /> : <RefreshCcwDot className="w-3 h-3 mr-1" />}
          Auto-Sync
        </Button>
      </div>

      <ScrollArea className="flex-1 p-6 relative z-10" ref={scrollRef}>
        <div 
          className="space-y-4 pb-32 text-center pt-16"
        >
          {activeLyrics.map((line, index) => {
            const textTrimmed = line.text.trim();
            const isSectionHeader = (textTrimmed.startsWith('[') && textTrimmed.endsWith(']')) || 
                                    /^(主歌|副歌|桥段|最终副歌|intro|outro|verse|chorus|bridge)/i.test(textTrimmed);
            
            let baseStyles = "";
            let textStyles = "";

            if (isUnsynced) {
                 if (isSectionHeader) {
                    baseStyles = "mt-12 mb-4";
                    textStyles = index <= currentLineIndex ? "text-primary font-bold text-xl" : "text-primary font-bold text-xl opacity-60";
                 } else {
                    textStyles = index === currentLineIndex 
                        ? "text-foreground text-xl font-bold" 
                        : index < currentLineIndex 
                            ? "text-muted-foreground text-lg opacity-60" 
                            : "text-muted-foreground text-lg opacity-40";
                 }
            } else {
                 if (isSectionHeader) {
                    baseStyles = "mt-12 mb-4";
                 }
                 
                 textStyles = index === currentLineIndex
                  ? "text-foreground text-2xl font-bold scale-105"
                  : index < currentLineIndex
                    ? "text-muted-foreground text-lg opacity-50"
                    : "text-muted-foreground text-lg opacity-30";
                    
                 if (isSectionHeader && index !== currentLineIndex) {
                    textStyles = "text-primary/70 font-bold text-xl tracking-wide uppercase text-sm";
                 } else if (isSectionHeader && index === currentLineIndex) {
                    textStyles = "text-primary font-bold text-xl tracking-wide uppercase scale-105 shadow-primary/20";
                 }
            }

            return (
              <div
                key={index}
                ref={(el) => { lineRefs.current[index] = el }}
                className={`transition-all duration-300 transform origin-center ${baseStyles} ${textStyles} ${!textTrimmed ? 'min-h-[2rem]' : ''}`}
              >
                {line.text}
              </div>
            )
          })}
        </div>
      </ScrollArea>
      {isLoading && (
        <div className="absolute top-4 left-4 z-20 animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
      )}
    </div>
  )
}
