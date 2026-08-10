"use client"

import React, { useMemo, useState, useEffect, useRef } from "react"
import { type LyricLine } from "@/hooks/useLyrics"

interface KaraokeLyricsViewProps {
  currentTime: number
  isPlaying: boolean
  duration?: number
  activeLyrics: LyricLine[]
}

export function KaraokeLyricsView({ currentTime, isPlaying, duration, activeLyrics }: KaraokeLyricsViewProps) {
  const [smoothTime, setSmoothTime] = useState(currentTime);
  const lastUpdateRef = useRef(performance.now());
  const currentTimeRef = useRef(currentTime);
  
  useEffect(() => {
    currentTimeRef.current = currentTime;
    lastUpdateRef.current = performance.now();
    setSmoothTime(currentTime);
  }, [currentTime]);

  useEffect(() => {
    if (!isPlaying) return;
    let animationFrameId: number;

    const loop = (now: DOMHighResTimeStamp) => {
      const dt = (now - lastUpdateRef.current) / 1000;
      const cappedDt = Math.min(dt, 1.0); 
      setSmoothTime(currentTimeRef.current + cappedDt);
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying]);

  // Check if lyrics are unsynced
  const isUnsynced = useMemo(() => {
    return activeLyrics.length > 0 && !activeLyrics.some(
      (line) => typeof line.time === 'number' && !isNaN(line.time) && line.time >= 0 && line.text.trim() !== ""
    );
  }, [activeLyrics]);

  // Determine the active line and next line
  const { activeLine, nextLine, opacity, progress } = useMemo(() => {
    let activeLine: LyricLine | null = null
    let nextLine: LyricLine | null = null
    let opacity = 1
    let progress = 0
    let activeIndex = -1

    if (activeLyrics.length === 0) {
      return { activeLine, nextLine, opacity, progress }
    }

    if (isUnsynced) {
      if (duration && duration > 0) {
        const pct = Math.max(0, Math.min(1, smoothTime / duration))
        const lineIndex = Math.floor(pct * activeLyrics.length)
        activeIndex = Math.min(Math.max(0, lineIndex), activeLyrics.length - 1)
        activeLine = activeLyrics[activeIndex]

        // Next line preview
        for (let j = activeIndex + 1; j < activeLyrics.length; j++) {
          if (activeLyrics[j].text.trim()) {
            nextLine = activeLyrics[j]
            break
          }
        }

        // Unsynced fade window
        const lineDuration = duration / activeLyrics.length
        const lineStartTime = activeIndex * lineDuration
        const lineEndTime = lineStartTime + lineDuration
        const fadeTime = Math.min(0.3, lineDuration / 3)

        if (smoothTime - lineStartTime < fadeTime) {
          opacity = (smoothTime - lineStartTime) / fadeTime
        } else if (lineEndTime - smoothTime < fadeTime) {
          opacity = (lineEndTime - smoothTime) / fadeTime
        }
      } else {
        activeLine = activeLyrics[0]
      }
    } else {
      // Synced lyrics: scan backwards to find the current active timed line
      for (let i = activeLyrics.length - 1; i >= 0; i--) {
        const line = activeLyrics[i]
        const endTime = line.endTime !== undefined ? line.endTime : line.time + 3.5
        if (line.time >= 0 && smoothTime >= line.time && smoothTime <= endTime) {
          activeLine = line
          activeIndex = i
          break
        }
      }

      // Next line preview
      if (activeIndex !== -1) {
        for (let j = activeIndex + 1; j < activeLyrics.length; j++) {
          if (activeLyrics[j].text.trim()) {
            nextLine = activeLyrics[j]
            break
          }
        }
      } else {
        // Find the first upcoming lyric
        for (let j = 0; j < activeLyrics.length; j++) {
          if (activeLyrics[j].time >= smoothTime && activeLyrics[j].text.trim()) {
            nextLine = activeLyrics[j]
            break
          }
        }
      }

      // Compute precise fade and progress for active line
      if (activeLine) {
        const lineEndTime = activeLine.endTime !== undefined ? activeLine.endTime : activeLine.time + 3.5
        const fadeTime = 0.3

        // Compute opacity
        if (smoothTime - activeLine.time < fadeTime) {
          opacity = (smoothTime - activeLine.time) / fadeTime
        } else if (lineEndTime - smoothTime < fadeTime) {
          opacity = (lineEndTime - smoothTime) / fadeTime
        }
        opacity = Math.max(0, Math.min(1, opacity))

        // Compute progress
        const total = lineEndTime - activeLine.time
        const elapsed = Math.max(0, smoothTime - activeLine.time)
        progress = Math.max(0, Math.min(1, total > 0 ? elapsed / total : 0))
      }
    }

    return { activeLine, nextLine, opacity, progress }
  }, [smoothTime, duration, activeLyrics, isUnsynced])

  if (!activeLine) {
    // Blank/empty state, render nothing (or show upcoming next line preview if available)
    if (nextLine) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-6 md:px-12 relative z-10 select-none">
          <div className="text-muted-foreground/30 text-lg md:text-xl font-medium max-w-2xl animate-pulse">
            {nextLine.text.replace(/\$5[a-fA-F0-9]{1,2}/gi, "")}
          </div>
        </div>
      )
    }
    return null
  }

  const activeText = activeLine.text.replace(/\$5[a-fA-F0-9]{1,2}/gi, "")
  const nextText = nextLine ? nextLine.text.replace(/\$5[a-fA-F0-9]{1,2}/gi, "") : ""
  
  const tokensWithProgress = useMemo(() => {
    if (!activeText) return [];
    // Split by spaces but preserve them in the array
    const tokens = activeText.split(/(\s+)/);
    let currentIndex = 0;
    return tokens.map(token => {
      const startProgress = currentIndex / activeText.length;
      currentIndex += token.length;
      const endProgress = currentIndex / activeText.length;
      return { token, startProgress, endProgress };
    });
  }, [activeText]);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 md:px-12 relative z-10 select-none">
      {/* Active Line Container */}
      <div 
        style={{ opacity }} 
        className="w-full max-w-5xl mx-auto mb-8 text-lg md:text-xl font-bold leading-relaxed break-words whitespace-pre-wrap"
        id="active-lyric-container"
      >
        {tokensWithProgress.map((t, i) => {
          const denom = t.endProgress - t.startProgress;
          const p = denom === 0 ? 0 : Math.max(0, Math.min(1, (progress - t.startProgress) / denom));
          
          if (p === 0) {
            return <span key={i} className="text-foreground/30">{t.token}</span>;
          }
          if (p === 1) {
            return <span key={i} className="text-foreground">{t.token}</span>;
          }
          return (
            <span 
              key={i}
              style={{
                backgroundImage: `linear-gradient(to right, hsl(var(--foreground)) ${p * 100}%, hsl(var(--foreground) / 0.3) ${p * 100}%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: 'transparent'
              }}
            >
              {t.token}
            </span>
          );
        })}
      </div>

      {/* Next Line Preview */}
      {nextText && (
        <div 
          className="text-muted-foreground/40 text-lg md:text-xl font-medium max-w-xl mx-auto animate-fade-in"
          id="next-lyric-preview"
        >
          {nextText}
        </div>
      )}
    </div>
  )
}
