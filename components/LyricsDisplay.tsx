"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Music2, RefreshCcw, RefreshCcwDot, Mic2, ListMusic } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/AppContext"
import { useActiveLyrics } from "@/hooks/useActiveLyrics"
import { KaraokeLyricsView } from "./KaraokeLyricsView"

interface LyricsDisplayProps {
  currentTime: number
  isPlaying: boolean
  duration?: number
}

export function LyricsDisplay({ currentTime, isPlaying, duration }: LyricsDisplayProps) {
  const { currentTrack } = useApp()
  const { activeLyrics, isLoading, error } = useActiveLyrics()

  const [lyricsMode, setLyricsMode] = useState<"scroll" | "karaoke">((): "scroll" | "karaoke" => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("joelify_lyrics_mode")
      if (saved === "scroll" || saved === "karaoke") {
        return saved
      }
    }
    return "karaoke"
  })

  useEffect(() => {
    localStorage.setItem("joelify_lyrics_mode", lyricsMode)
  }, [lyricsMode])

  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [isAutoScroll, setIsAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])
  const isProgrammaticScroll = useRef(false)

  const isUnsynced = useMemo(() => {
    return activeLyrics.length > 0 && !activeLyrics.some(
      (line) => typeof line.time === 'number' && !isNaN(line.time) && line.time >= 0 && line.text.trim() !== ""
    );
  }, [activeLyrics]);

  useEffect(() => {
    if (!activeLyrics || activeLyrics.length === 0) return
    if (!isAutoScroll) return // Do not sync with audio if auto-scroll is off

    // Unsynced Fallback: Interpolate based on current time and track duration
    if (isUnsynced) {
      if (duration && duration > 0) {
        let pct = currentTime / duration;
        if (pct < 0) pct = 0;
        if (pct > 1) pct = 1;
        const newIndex = Math.floor(pct * activeLyrics.length);
        const clampedIndex = isNaN(newIndex) ? 0 : Math.min(Math.max(0, newIndex), activeLyrics.length - 1);
        if (clampedIndex !== currentLineIndex) {
          setCurrentLineIndex(clampedIndex);
        }
      } else if (currentLineIndex !== 0) {
        setCurrentLineIndex(0);
      }
      return;
    }

    // Synced Lyrics: find the last valid line whose time is <= currentTime
    let newIndex = -1;
    for (let i = 0; i < activeLyrics.length; i++) {
        const t = activeLyrics[i].time;
        if (typeof t === 'number' && !isNaN(t) && t >= 0 && currentTime >= t) {
            newIndex = i;
        }
    }

    if (newIndex >= 0 && newIndex < activeLyrics.length && newIndex !== currentLineIndex) {
      setCurrentLineIndex(newIndex);
    } else if (newIndex === -1 && currentLineIndex !== 0) {
      setCurrentLineIndex(0);
    }
  }, [currentTime, duration, activeLyrics, currentLineIndex, isAutoScroll, isUnsynced])

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
    const lineEl = lineRefs.current[currentLineIndex];
    const viewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    
    if (lineEl && viewport) {
      isProgrammaticScroll.current = true;
      requestAnimationFrame(() => {
        // Calculate the top position relative to the viewport
        const viewportHeight = viewport.clientHeight;
        const lineTop = lineEl.offsetTop;
        const lineHeight = lineEl.offsetHeight;
        
        // Scroll so the line is centered
        const targetScrollTop = lineTop - (viewportHeight / 2) + (lineHeight / 2);
        
        viewport.scrollTo({
          top: targetScrollTop,
          behavior: "smooth"
        });
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

  if (isLoading && activeLyrics.length === 0) {
    return (
      <div className="flex flex-col items-center h-full w-full p-8 overflow-hidden bg-background">
        <div className="w-full max-w-2xl mx-auto space-y-8 pt-32 opacity-70">
          <div className="space-y-4">
            <Skeleton className="h-6 w-3/4 max-w-[300px] rounded-full mx-auto" />
            <Skeleton className="h-6 w-full max-w-[400px] rounded-full mx-auto" />
            <Skeleton className="h-6 w-5/6 max-w-[350px] rounded-full mx-auto" />
          </div>
          <div className="space-y-4 pt-4">
            <Skeleton className="h-6 w-4/5 max-w-[380px] rounded-full mx-auto" />
            <Skeleton className="h-6 w-full max-w-[420px] rounded-full mx-auto" />
            <Skeleton className="h-6 w-2/3 max-w-[280px] rounded-full mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  if (activeLyrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <Music2 size={48} className="mb-4 opacity-50" />
        <p className="text-sm">No lyrics available</p>
        <p className="text-xs mt-1 text-center">We couldn't find lyrics for {currentTrack.title}</p>
        {error && <p className="text-xs mt-4 opacity-50 text-center max-w-sm">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden bg-background">
      <div className="absolute inset-0 z-0 animate-gradient-move bg-gradient-to-br from-background via-secondary/30 to-background opacity-50"></div>
      
      <div className="fixed top-[18px] right-12 z-[60] flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setLyricsMode(lyricsMode === "scroll" ? "karaoke" : "scroll")}
          className={`h-6 px-2 text-xs transition-all ${lyricsMode === "karaoke" ? "text-primary font-semibold" : "text-zinc-500 hover:text-white"}`}
        >
          {lyricsMode === "karaoke" ? <Mic2 className="w-3.5 h-3.5 mr-1" /> : <ListMusic className="w-3.5 h-3.5 mr-1" />}
          {lyricsMode === "karaoke" ? "Karaoke" : "Fade"}
        </Button>

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

      {lyricsMode === "scroll" ? (
        <ScrollArea className="flex-1 p-6 relative z-10" ref={scrollRef}>
          <div 
            className="space-y-4 pb-32 text-center pt-16"
          >
            {activeLyrics.map((line, index) => {
              // Strip out RSC wire artifacts just in case, but avoid targeting valid hex/characters
              const safeText = (line.text || "").replace(/\$5[a-fA-F0-9]{1,2}/gi, "");
              const textTrimmed = safeText.trim();
              const isSectionHeader = (textTrimmed.startsWith('[') && textTrimmed.endsWith(']')) || 
                                      /^(主歌|副歌|桥段|最终副歌|intro|outro|verse|chorus|bridge|pre-chorus|break|final chorus)/i.test(textTrimmed);
              
              let baseStyles = "";
              let textStyles = "";

               if (isUnsynced) {
                   if (isSectionHeader) {
                      baseStyles = "mt-12 mb-4";
                      textStyles = index <= currentLineIndex ? "text-primary font-bold text-lg md:text-xl" : "text-primary font-bold text-lg md:text-xl opacity-60";
                   } else {
                      textStyles = index === currentLineIndex 
                          ? "text-foreground text-lg md:text-xl font-bold" 
                          : index < currentLineIndex 
                              ? "text-muted-foreground text-lg md:text-xl opacity-60" 
                              : "text-muted-foreground text-lg md:text-xl opacity-40";
                   }
              } else {
                   if (isSectionHeader) {
                      baseStyles = "mt-12 mb-4";
                   }
                   
                   textStyles = index === currentLineIndex
                    ? "text-foreground text-lg md:text-xl font-bold"
                    : index < currentLineIndex
                      ? "text-muted-foreground text-lg md:text-xl opacity-50"
                      : "text-muted-foreground text-lg md:text-xl opacity-30";
                      
                   if (isSectionHeader && index !== currentLineIndex) {
                      textStyles = "text-primary/70 font-bold tracking-wide uppercase text-sm";
                   } else if (isSectionHeader && index === currentLineIndex) {
                      textStyles = "text-primary font-bold tracking-wide uppercase shadow-primary/20 text-base";
                   }
              }

              return (
                <div
                  key={`lyric-${index}`}
                  ref={(el) => { lineRefs.current[index] = el }}
                  className={`transition-all duration-300 transform origin-center px-4 md:px-8 max-w-5xl mx-auto w-full break-words whitespace-normal leading-relaxed ${baseStyles} ${textStyles} ${!textTrimmed ? 'min-h-[2rem]' : ''}`}
                >
                  {safeText || " "}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      ) : (
        <KaraokeLyricsView
          currentTime={currentTime}
          isPlaying={isPlaying}
          duration={duration}
          activeLyrics={activeLyrics}
        />
      )}
    </div>
  )
}

