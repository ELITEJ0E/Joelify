"use client"

import { useMemo } from "react"
import { useApp } from "@/contexts/AppContext"
import { useLyrics, parseLrc, type LyricLine } from "@/hooks/useLyrics"

export function useActiveLyrics() {
  const { currentTrack } = useApp()
  const { lyrics: fetchedLyrics, isLoading, error } = useLyrics(
    currentTrack?.title,
    currentTrack?.artist,
    currentTrack?.id
  )

  const activeLyrics = useMemo(() => {
    let lyrics = fetchedLyrics && fetchedLyrics.length > 0 
      ? fetchedLyrics 
      : currentTrack?.lyrics 
        ? parseLrc(currentTrack.lyrics)
        : [];

    // Filter out potential loading/error placeholders, API artifacts or raw HTML/Suno status codes (like &60, &#60;, 60, loading...)
    const filteredLyrics = lyrics.filter(line => {
      if (!line.text) return true; // Preserve blank lines for formatting
      const txt = line.text.trim().toLowerCase();
      const isFlightRef = /^\$[0-9a-fA-F]+$/.test(txt);
      const isPlaceholder = 
        txt === "&60" ||
        txt === "&#60;" ||
        txt === "&60;" ||
        txt === "60" ||
        txt === "loading" ||
        txt === "loading..." ||
        txt === "[loading]" ||
        isFlightRef;
      return !isPlaceholder;
    });

    const hasValidText = filteredLyrics.some(line => line.text && line.text.trim() !== "");
    if (!hasValidText) {
      return [];
    }
    return filteredLyrics;
  }, [fetchedLyrics, currentTrack?.lyrics]);

  return { activeLyrics, isLoading, error };
}
