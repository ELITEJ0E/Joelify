"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence, useMotionValue, useTransform, animate, useReducedMotion, type PanInfo } from "framer-motion"
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle,
  Volume2, VolumeX, List, Youtube, Music2, Video, Music,
  Type, Minimize2, Maximize2, Mic, ChevronDown,
} from "lucide-react"
import { TrackImage as Image } from "./TrackImage"
import { useApp } from "@/contexts/AppContext"
import { YouTubePlayer } from "./YouTubePlayer"
import { QueueSheet } from "./QueueSheet"
import { LyricsDisplay } from "./LyricsDisplay"
import { MiniPlayer } from "./MiniPlayer"
import { SleepTimer } from "./SleepTimer"
import { ExpandablePlayer } from "./ExpandablePlayer"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { LIKED_SONGS_PLAYLIST_ID } from "./LikedSongsView"
import { getOfflineAudioBlobUrl } from "@/lib/sunoOffline"
import { getLocalFileBlob } from "@/lib/localFiles"

export function PlayerControls() {
  const {
    currentTrack, queue, volume, shuffle, repeat, playbackPosition,
    currentPlaylistId, playlists, playbackSource,
    likedSongs, joelsSongs,
    setCurrentTrack, setQueue, setVolume, toggleShuffle,
    toggleRepeat, setPlaybackPosition, setPlaybackSource,
    audioSettings, user, isInitialized,
  } = useApp()

  // We check for isInitialized from context but it's not exported.
  // Actually, let's use isFirstRender better.
  const [youtubePlayer, setYoutubePlayer] = useState<any>(null)
  const sunoAudioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const currentTimeMotion = useMotionValue(0)
  const currentTimeRef = useRef(0)
  const lastReactTimeRef = useRef(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [isMiniPlayer, setIsMiniPlayer] = useState(false)
  const [isExpandedPlayer, setIsExpandedPlayer] = useState(false)
  const [isLyricsOpen, setIsLyricsOpen] = useState(false)
  const [isQueueOpen, setIsQueueOpen] = useState(false)
  // Local video toggle for the bar — separate from expanded player's video
  const [barVideoMode, setBarVideoMode] = useState(false)
  const [offlineSunoUrl, setOfflineSunoUrl] = useState<string | null>(null)
  const [localFileUrl, setLocalFileUrl] = useState<string | null>(null)

  const trackX = useMotionValue(0)
  const hasMovedRef = useRef(false)

  const [vh, setVh] = useState(() => (typeof window !== "undefined" ? window.innerHeight : 800))
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const scrollProgressMV = useMotionValue(0)
  const isExpandedRef = useRef(false)

  const miniBarOpacity = useTransform(scrollProgressMV, [0, 0.2], [1, 0])
  const miniBarPointerEvents = useTransform(scrollProgressMV, (p) => (p > 0.15 ? "none" : "auto"))

  const shouldReduceMotion = useReducedMotion()
  const springConfig = shouldReduceMotion 
    ? { duration: 0.15 } 
    : { type: "spring", stiffness: 300, damping: 30 }

  useEffect(() => {
    const handleResize = () => {
      setVh(window.innerHeight)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // ─── Scroll-Snap Container Listener ─────────────────────────────────────
  const isProgrammaticScrollRef = useRef(false);
  const isExpandedPlayerRef = useRef(false);
  const isQueueOpenRef = useRef(false);
  const isLyricsOpenRef = useRef(false);

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    let rafId: number | null = null
    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const h = window.innerHeight || 800
        const scrollTop = container.scrollTop
        const progress = Math.min(1, Math.max(0, scrollTop / h))
        scrollProgressMV.set(progress)

        if (isProgrammaticScrollRef.current) return

        const isExpanded = scrollTop >= h / 2
        if (isExpanded !== isExpandedRef.current) {
          isExpandedRef.current = isExpanded
          isExpandedPlayerRef.current = isExpanded
          setIsExpandedPlayer(isExpanded)
          if (isExpanded) {
            if (typeof window !== "undefined" && !window.history.state?.modal?.startsWith("expandable")) {
              window.history.pushState({ modal: "expandable-player" }, "")
            }
          } else {
            if (typeof window !== "undefined" && window.history.state?.modal?.startsWith("expandable")) {
              window.history.back()
            }
          }
        }
      })
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      container.removeEventListener("scroll", handleScroll)
    }
  }, [scrollProgressMV])

  useEffect(() => {
    isExpandedPlayerRef.current = isExpandedPlayer;
    isQueueOpenRef.current = isQueueOpen;
    isLyricsOpenRef.current = isLyricsOpen;
  }, [isExpandedPlayer, isQueueOpen, isLyricsOpen]);

  // ─── Popstate / Hardware Back Button Navigation ───────────────────────

  const handlePopState = useCallback((event: PopStateEvent) => {
    const modal = event.state?.modal;

    // 1. If Queue sheet overlay in collapsed mode is open, close it first
    if (isQueueOpenRef.current) {
      setIsQueueOpen(false);
      return;
    }

    // 2. If Lyrics sheet overlay in collapsed mode is open, close it first
    if (isLyricsOpenRef.current) {
      setIsLyricsOpen(false);
      return;
    }

    // 3. Popped to a mini player sheet
    if (modal === "mini-queue") {
      setIsQueueOpen(true);
      setIsLyricsOpen(false);
      return;
    }
    if (modal === "mini-lyrics") {
      setIsLyricsOpen(true);
      setIsQueueOpen(false);
      return;
    }

    // 4. Popped to expandable player states (ExpandablePlayer component manages sub-sheets)
    if (modal === "expandable-player" || modal === "expandable-lyrics" || modal === "expandable-queue") {
      isExpandedRef.current = true;
      isExpandedPlayerRef.current = true;
      setIsExpandedPlayer(true);
      setIsLyricsOpen(false);
      setIsQueueOpen(false);
      const h = window.innerHeight || 800;
      isProgrammaticScrollRef.current = true;
      scrollContainerRef.current?.scrollTo({ top: h, behavior: "smooth" });
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 400);
      return;
    }

    // 5. If we were in expandable player and popped out to page level:
    if (isExpandedPlayerRef.current) {
      isExpandedRef.current = false;
      isExpandedPlayerRef.current = false;
      setIsExpandedPlayer(false);
      setIsLyricsOpen(false);
      setIsQueueOpen(false);
      isProgrammaticScrollRef.current = true;
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 400);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [handlePopState]);

  const openExpandedPlayer = useCallback(() => {
    isExpandedRef.current = true;
    isExpandedPlayerRef.current = true;
    setIsExpandedPlayer(true);
    setIsLyricsOpen(false);
    setIsQueueOpen(false);
    const h = window.innerHeight || 800;
    isProgrammaticScrollRef.current = true;
    scrollContainerRef.current?.scrollTo({ top: h, behavior: "smooth" });
    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 400);
    if (typeof window !== "undefined" && !window.history.state?.modal?.startsWith("expandable")) {
      window.history.pushState({ modal: "expandable-player" }, "");
    }
  }, []);

  const closeExpandedPlayer = useCallback(() => {
    if (isExpandedPlayerRef.current) {
      isExpandedRef.current = false;
      isExpandedPlayerRef.current = false;
      setIsExpandedPlayer(false);
      isProgrammaticScrollRef.current = true;
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 400);
      if (typeof window !== "undefined" && (
        window.history.state?.modal === "expandable-player" ||
        window.history.state?.modal === "expandable-lyrics" ||
        window.history.state?.modal === "expandable-queue"
      )) {
        window.history.back();
      }
    }
  }, []);

  const closeMiniPlayer = useCallback(() => {
    if (isMiniPlayer) {
      setIsMiniPlayer(false);
      if (typeof window !== "undefined" && window.history.state?.modal) {
        window.history.back();
      }
    }
  }, [isMiniPlayer]);

  const setLyricsOpen = useCallback((open: boolean) => {
    if (open) {
      setIsLyricsOpen(true);
      if (typeof window !== "undefined" && window.history.state?.modal !== "mini-lyrics") {
        window.history.pushState({ modal: "mini-lyrics" }, "");
      }
    } else {
      setIsLyricsOpen(false);
      if (typeof window !== "undefined" && window.history.state?.modal === "mini-lyrics") {
        window.history.back();
      }
    }
  }, []);

  const setQueueOpen = useCallback((open: boolean) => {
    if (open) {
      setIsQueueOpen(true);
      if (typeof window !== "undefined" && window.history.state?.modal !== "mini-queue") {
        window.history.pushState({ modal: "mini-queue" }, "");
      }
    } else {
      setIsQueueOpen(false);
      if (typeof window !== "undefined" && window.history.state?.modal === "mini-queue") {
        window.history.back();
      }
    }
  }, []);

  // ─── Touch Swipe UP on Mini Player Bar ─────────────────────────────────

  const trackEndHandledRef = useRef(false)
  const isSeekingRef = useRef(false)
  const hasRestoredPositionRef = useRef(false)
  const initialLoadHandledRef = useRef(false)
  const playedTracksRef = useRef(new Set<string>())
  const playHistoryRef = useRef<string[]>([])

  // ─── helpers ────────────────────────────────────────────────────────────────

  const getContextTracks = useCallback(() => {
    if (currentPlaylistId === LIKED_SONGS_PLAYLIST_ID) return likedSongs
    if (currentPlaylistId === "joels_music") return joelsSongs
    if (currentPlaylistId) {
      return playlists.find((p) => p.id === currentPlaylistId)?.tracks ?? []
    }
    return []
  }, [currentPlaylistId, likedSongs, playlists, joelsSongs])

  const getNextShuffleTrack = useCallback((tracks: any[]) => {
    if (!tracks.length) return null
    if (playedTracksRef.current.size >= tracks.length) {
      playedTracksRef.current.clear()
      playHistoryRef.current = []
    }
    const unplayed = tracks.filter((t) => !playedTracksRef.current.has(t.id))
    const pool = unplayed.length > 0 ? unplayed : tracks
    return pool[Math.floor(Math.random() * pool.length)]
  }, [])

  // ─── repeat one ─────────────────────────────────────────────────────────────

  const handleRepeatOne = useCallback(() => {
    if (!currentTrack) return
    trackEndHandledRef.current = true
    if (playbackSource === "youtube" && youtubePlayer) {
      try {
        if (typeof youtubePlayer.seekTo === 'function') youtubePlayer.seekTo(0, true)
        if (typeof youtubePlayer.playVideo === 'function') youtubePlayer.playVideo()
        setIsPlaying(true)
      } catch (e) { console.warn("YT seek/play failed", e) }
      setTimeout(() => { trackEndHandledRef.current = false }, 1500)
    } else if (playbackSource === "suno" && sunoAudioRef.current) {
      try {
        sunoAudioRef.current.currentTime = 0;
        const playPromise = sunoAudioRef.current.play();
        if (playPromise !== undefined) playPromise.catch(e => console.warn("Suno loop play rejected:", e));
        setIsPlaying(true);
      } catch (e) { console.warn("Suno loop error", e) }
      setTimeout(() => { trackEndHandledRef.current = false }, 1500)
    }
    setCurrentTime(0)
    setPlaybackPosition(0)
  }, [currentTrack, youtubePlayer, playbackSource, setPlaybackPosition])

  // ─── next track ─────────────────────────────────────────────────────────────

  const handleNext = useCallback(() => {
    if (repeat === "one" && currentTrack) { handleRepeatOne(); return }

    trackEndHandledRef.current = false

    if (currentTrack) {
      playedTracksRef.current.add(currentTrack.id)
      playHistoryRef.current.push(currentTrack.id)
    }

    if (queue.length > 0) {
      const nextTrack = queue[0]
      setCurrentTrack(nextTrack)
      setQueue(queue.slice(1))
      setCurrentTime(0)
      setPlaybackPosition(0)
      if (playbackSource === "youtube") setIsPlaying(true)
      else if (playbackSource === "suno") setIsPlaying(true)
      return
    }

    const contextTracks = getContextTracks()
    if (contextTracks.length > 0) {
      let nextTrack: typeof currentTrack = null

      if (shuffle) {
        nextTrack = getNextShuffleTrack(contextTracks)
        if (!nextTrack && repeat === "all") {
          playedTracksRef.current.clear()
          playHistoryRef.current = []
          nextTrack = getNextShuffleTrack(contextTracks)
        }
      } else {
        const idx = contextTracks.findIndex((t: any) => t.id === currentTrack?.id)
        if (idx + 1 < contextTracks.length) {
          nextTrack = contextTracks[idx + 1]
        } else if (repeat === "all") {
          nextTrack = contextTracks[0]
          playedTracksRef.current.clear()
          playHistoryRef.current = []
        }
      }

      if (nextTrack) {
        setCurrentTrack(nextTrack)
        setCurrentTime(0)
        setPlaybackPosition(0)
        if (playbackSource === "youtube") setIsPlaying(true)
        else if (playbackSource === "suno") setIsPlaying(true)
        return
      }
    }

    setIsPlaying(false)
    setCurrentTime(0)
    setPlaybackPosition(0)
  }, [
    repeat, shuffle, currentTrack, queue, playbackSource, getContextTracks,
    getNextShuffleTrack, handleRepeatOne, setCurrentTrack, setQueue, setPlaybackPosition,
  ])

  // ─── previous ───────────────────────────────────────────────────────────────

  const handlePrevious = useCallback(() => {
    // 1. Replay current song if progress > 3s
    if (currentTime > 3) {
      if (playbackSource === "youtube" && youtubePlayer) {
        try { if (typeof youtubePlayer.seekTo === 'function') youtubePlayer.seekTo(0, true) } catch(e){}
      } else if (playbackSource === "suno" && sunoAudioRef.current) {
        sunoAudioRef.current.currentTime = 0
      }
      setCurrentTime(0); setPlaybackPosition(0)
      return
    }

    // 2. Go back in history
    if (playHistoryRef.current.length > 1) {
      playHistoryRef.current.pop() // remove current
      const prevId = playHistoryRef.current[playHistoryRef.current.length - 1]
      const contextTracks = getContextTracks()
      const prevTrack = contextTracks.find((t: any) => t.id === prevId)
      if (prevTrack) {
        setCurrentTrack(prevTrack);
        setCurrentTime(0); setPlaybackPosition(0);
        setIsPlaying(true)
        return
      }
    }
    
    // 3. Fallback: previous in context
    const contextTracks = getContextTracks()
    if (contextTracks.length > 0) {
      const idx = contextTracks.findIndex((t: any) => t.id === currentTrack?.id)
      if (idx > 0) {
        setCurrentTrack(contextTracks[idx - 1]);
        setCurrentTime(0); setPlaybackPosition(0);
        setIsPlaying(true)
        return
      }
    }

    // 4. Default seek to start
    if (playbackSource === "youtube" && youtubePlayer) {
      try { if (typeof youtubePlayer.seekTo === 'function') youtubePlayer.seekTo(0, true) } catch(e){}
    }
    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.currentTime = 0
    setCurrentTime(0); setPlaybackPosition(0)
  }, [
    youtubePlayer, setCurrentTrack, setPlaybackPosition,
    currentTime, playbackSource, getContextTracks, currentTrack
  ])

  // ─── play / pause ───────────────────────────────────────────────────────────

  const handlePlayPause = useCallback(() => {
    if (!currentTrack) return
    if (playbackSource === "youtube") {
      if (!youtubePlayer) {
        setIsPlaying((prev) => !prev)
        return
      }
      try {
        if (isPlaying) {
          if (typeof youtubePlayer.pauseVideo === 'function') youtubePlayer.pauseVideo()
          setIsPlaying(false)
        } else {
          if (typeof youtubePlayer.playVideo === 'function') youtubePlayer.playVideo()
          setIsPlaying(true)
        }
      } catch (e) {
        console.warn("YT play/pause error", e)
        setIsPlaying((prev) => !prev)
      }
    } else if (playbackSource === "suno" && sunoAudioRef.current) {
      try {
        if (isPlaying) {
          sunoAudioRef.current.pause()
          setIsPlaying(false)
        } else {
          const playPromise = sunoAudioRef.current.play()
          if (playPromise !== undefined) playPromise.catch(e => console.warn("Suno play rejected:", e))
          setIsPlaying(true)
        }
      } catch (e) {
        console.warn("Suno play/pause error", e)
        setIsPlaying((prev) => !prev)
      }
    } else {
      setIsPlaying((prev) => !prev)
    }
  }, [youtubePlayer, currentTrack, isPlaying, playbackSource])

  // ─── seek ────────────────────────────────────────────────────────────────────

  const handleSeekForward = useCallback(() => {
    if (!currentTrack || !isReady) return
    const newTime = Math.min(duration, currentTime + 5)
    if (playbackSource === "youtube" && youtubePlayer) {
      try { youtubePlayer.seekTo(newTime, true) } catch(e){}
    }
    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.currentTime = newTime
    setCurrentTime(newTime); setPlaybackPosition(newTime)
  }, [youtubePlayer, isReady, currentTrack, duration, currentTime, playbackSource, setPlaybackPosition])

  const handleSeekBackward = useCallback(() => {
    if (!currentTrack || !isReady) return
    const newTime = Math.max(0, currentTime - 5)
    if (playbackSource === "youtube" && youtubePlayer) {
      try { youtubePlayer.seekTo(newTime, true) } catch(e){}
    }
    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.currentTime = newTime
    setCurrentTime(newTime); setPlaybackPosition(newTime)
  }, [youtubePlayer, isReady, currentTrack, currentTime, playbackSource, setPlaybackPosition])

  const handleSeek = useCallback((value: number[]) => {
    if (!isReady) return
    const newTime = value[0]
    isSeekingRef.current = true
    if (playbackSource === "youtube" && youtubePlayer) {
      try { youtubePlayer.seekTo(newTime, true) } catch(e){}
    }
    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.currentTime = newTime
    setCurrentTime(newTime); setPlaybackPosition(newTime)
    setTimeout(() => { isSeekingRef.current = false }, 300)
  }, [youtubePlayer, isReady, setPlaybackPosition, playbackSource])

  // ─── volume ──────────────────────────────────────────────────────────────────

  const handleVolumeChange = useCallback((value: number[]) => {
    const v = value[0]
    setVolume(v)
    if (playbackSource === "youtube" && youtubePlayer) {
      try { youtubePlayer.setVolume(v) } catch(e){}
    }
    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.volume = v / 100
    setIsMuted(v === 0)
  }, [youtubePlayer, setVolume, playbackSource])

  const toggleMute = useCallback(() => {
    if (playbackSource === "youtube" && youtubePlayer) {
      try {
        if (isMuted) { 
          if (typeof youtubePlayer.unMute === 'function') youtubePlayer.unMute(); 
          if (typeof youtubePlayer.setVolume === 'function') youtubePlayer.setVolume(volume); 
          setIsMuted(false);
        } else { 
          if (typeof youtubePlayer.mute === 'function') youtubePlayer.mute(); 
          setIsMuted(true);
        }
      } catch (e) { console.warn("YT mute toggle failed", e) }
    } else if (playbackSource === "suno" && sunoAudioRef.current) {
      if (isMuted) { sunoAudioRef.current.volume = volume / 100; setIsMuted(false); }
      else { sunoAudioRef.current.volume = 0; setIsMuted(true); }
    }
  }, [youtubePlayer, isMuted, volume, playbackSource])

  // ─── Mini Progress Bar Hover & Seek ─────────────────────────────────────────
  const miniProgressRef = useRef<HTMLDivElement>(null)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverPercent, setHoverPercent] = useState<number | null>(null)
  const [hoverPos, setHoverPos] = useState<number | null>(null)

  const handleMiniProgressHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!miniProgressRef.current || duration <= 0) return
    const rect = miniProgressRef.current.getBoundingClientRect()
    const offsetX = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    const pct = (offsetX / rect.width) * 100
    const time = (offsetX / rect.width) * duration
    setHoverTime(time)
    setHoverPercent(pct)
    setHoverPos(offsetX)
  }, [duration])

  const handleMiniProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!miniProgressRef.current || duration <= 0) return
    const rect = miniProgressRef.current.getBoundingClientRect()
    const offsetX = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    const newTime = (offsetX / rect.width) * duration
    handleSeek([newTime])
  }, [duration, handleSeek])

  // ─── Swipe & Pan Gesture Handlers ──────────────────────────────────────────

  const handlePanStart = useCallback(() => {
    hasMovedRef.current = false
  }, [])

  const handlePan = useCallback((_: any, info: PanInfo) => {
    const absX = Math.abs(info.offset.x)
    const absY = Math.abs(info.offset.y)

    if (absX > absY && absX >= 6) {
      hasMovedRef.current = true
      trackX.set(info.offset.x)
    }
  }, [trackX])

  const handlePanEnd = useCallback((_: any, info: PanInfo) => {
    const absX = Math.abs(info.offset.x)
    const absY = Math.abs(info.offset.y)

    if (absX > absY && (absX > 50 || Math.abs(info.velocity.x) > 300)) {
      const isSwipeLeft = info.offset.x < -50 || info.velocity.x < -300
      const isSwipeRight = info.offset.x > 50 || info.velocity.x > 300

      if (isSwipeLeft) {
        if (shouldReduceMotion) {
          handleNext()
          trackX.set(0)
        } else {
          animate(trackX, -150, { duration: 0.12, ease: "easeOut" }).then(() => {
            handleNext()
            trackX.set(120)
            animate(trackX, 0, springConfig)
          })
        }
      } else if (isSwipeRight) {
        if (shouldReduceMotion) {
          handlePrevious()
          trackX.set(0)
        } else {
          animate(trackX, 150, { duration: 0.12, ease: "easeOut" }).then(() => {
            handlePrevious()
            trackX.set(-120)
            animate(trackX, 0, springConfig)
          })
        }
      } else {
        animate(trackX, 0, springConfig)
      }
    } else {
      animate(trackX, 0, springConfig)
    }

    setTimeout(() => {
      hasMovedRef.current = false
    }, 60)
  }, [trackX, springConfig, shouldReduceMotion, handleNext, handlePrevious])

  const handleBarClick = useCallback(() => {
    if (hasMovedRef.current) return
    openExpandedPlayer()
  }, [openExpandedPlayer])

  // ─── YouTube callbacks ───────────────────────────────────────────────────────

  const handleYouTubeStateChange = useCallback((event: any) => {
    if (playbackSource !== "youtube") return
    const state = event.data
    switch (state) {
      case 1:
        setIsPlaying(true)
        if (trackEndHandledRef.current && repeat !== "one") trackEndHandledRef.current = false
        if (youtubePlayer && typeof youtubePlayer.setPlaybackQuality === 'function' && audioSettings.youtubeQuality !== "audio") {
          youtubePlayer.setPlaybackQuality(audioSettings.youtubeQuality)
        }
        break
      case 2:
        setIsPlaying(false)
        if (youtubePlayer?.getCurrentTime) {
          const t = youtubePlayer.getCurrentTime()
          setCurrentTime(t); setPlaybackPosition(t)
        }
        break
      case 0:
        if (!trackEndHandledRef.current) {
          trackEndHandledRef.current = true
          repeat === "one" ? handleRepeatOne() : handleNext()
        }
        break
      case -1:
        // Unstarted state occurs when a new track is loaded.
        // Doing setIsPlaying(false) here will cancel auto-play for newly selected tracks!
        break
    }
  }, [youtubePlayer, setPlaybackPosition, playbackSource, handleNext, audioSettings, repeat, handleRepeatOne])

  const handleError = useCallback((event: any) => {
    console.error("[Player] YouTube Error:", event.data)
    if ([2, 5, 100, 101, 150].includes(event.data)) setTimeout(() => handleNext(), 1000)
  }, [handleNext])

  const handleYouTubePlayerReady = useCallback((playerInstance: any) => {
    if (!playerInstance) {
      setYoutubePlayer(null)
      setIsReady(false)
      return
    }
    setYoutubePlayer(playerInstance)
    setIsReady(true)
    try {
      if (typeof playerInstance.setVolume === 'function') {
        playerInstance.setVolume(volume)
        if (isMuted && typeof playerInstance.mute === 'function') playerInstance.mute()
      }
    } catch (e) { console.warn("Player ready init failed", e) }
  }, [volume, isMuted])

  const handleYouTubeDurationReady = useCallback((d: number) => setDuration(d), [])

  // Called by ExpandablePlayer when its video player activates or deactivates.
  // When expanded video is ON  → mute the bar's audio player + hide bar video (avoid two sources)
  // When expanded video is OFF → unmute bar player (restore previous mute state)
  const handleVideoActiveChange = useCallback((videoActive: boolean) => {
    if (!youtubePlayer || typeof youtubePlayer.getIframe !== 'function') return
    try {
      // Check if iframe exists in DOM
      const iframe = youtubePlayer.getIframe()
      if (!iframe || !iframe.parentNode) {
          setYoutubePlayer(null)
          return
      }

      if (videoActive) {
        setBarVideoMode(false)   // hide bar iframe while expanded video is showing
        if (typeof youtubePlayer.mute === 'function') youtubePlayer.mute()
      } else {
        if (!isMuted && typeof youtubePlayer.unMute === 'function') youtubePlayer.unMute()
      }
    } catch (error) {
      console.warn("Error toggling YouTube player mute state (likely player partially destroyed):", error)
    }
  }, [youtubePlayer, isMuted])

  const handleYouTubeTimeUpdate = useCallback((ct: number, d: number) => {
    if (!isSeekingRef.current && playbackSource === "youtube") {
      currentTimeRef.current = ct;
      currentTimeMotion.set(ct);
      if (Math.abs(ct - lastReactTimeRef.current) >= 1.0) {
        lastReactTimeRef.current = ct;
        setCurrentTime(ct)
        setPlaybackPosition(ct)
      }
      setDuration((prev) => Math.abs(prev - d) > 1 ? d : prev)
    }
  }, [setPlaybackPosition, playbackSource, currentTimeMotion])

  // ─── effects ─────────────────────────────────────────────────────────────────

  const playbackSourceRef = useRef(playbackSource);
  useEffect(() => {
    playbackSourceRef.current = playbackSource;
    if (playbackSource === "youtube" && sunoAudioRef.current) {
      sunoAudioRef.current.pause();
    } else if (playbackSource === "suno" && youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') {
      try {
        youtubePlayer.pauseVideo();
      } catch (e) {
        console.warn("YT pauseVideo error during source switch", e);
      }
    }
  }, [playbackSource, youtubePlayer]);

  useEffect(() => {
    // Do not process track changes until context is fully initialized
    if (!isInitialized) return;

    if (currentTrack) {
      const currentSource = playbackSourceRef.current;
      if (currentSource === "suno" && !currentTrack.thumbnail?.includes("suno.ai") && !currentTrack.thumbnail?.includes("suno.com")) {
         setPlaybackSource("youtube");
      } else if (currentSource === "youtube" && currentTrack.thumbnail?.includes("suno.ai")) {
         setPlaybackSource("suno");
      }
      
      // Check offline url
      if (currentTrack.id.startsWith("local-")) {
        getLocalFileBlob(currentTrack.id).then((blob) => {
          if (blob) {
            setLocalFileUrl(URL.createObjectURL(blob));
          } else {
            setLocalFileUrl(null);
          }
        });
        setOfflineSunoUrl(null);
      } else if (currentTrack.thumbnail?.includes("suno.ai") || currentTrack.thumbnail?.includes("suno.com") || currentSource === "suno") {
        getOfflineAudioBlobUrl(currentTrack.id).then((url) => {
          setOfflineSunoUrl(url);
        });
        setLocalFileUrl(null);
      } else {
        setOfflineSunoUrl(null);
        setLocalFileUrl(null);
      }
      
      setCurrentTime(0); setPlaybackPosition(0); setDuration(0)
      hasRestoredPositionRef.current = false
      trackEndHandledRef.current = false
      
      // Auto-play ONLY if it's not the very first load of a track 
      // after initialization
      if (initialLoadHandledRef.current) {
        setIsPlaying(true)
      } else {
        // Mark the first load as handled so subsequent track changes auto-play
        initialLoadHandledRef.current = true
        setIsPlaying(false) // ensure initial track is paused
      }
    } else {
      setDuration(0); setCurrentTime(0); setPlaybackPosition(0)
      setIsPlaying(false)
      // We also mark handled if the initial state resolves to no-track
      initialLoadHandledRef.current = true
    }
  }, [currentTrack?.id, isInitialized, setPlaybackSource, setPlaybackPosition]) 

  useEffect(() => {
    if (!playbackSource) setPlaybackSource("youtube")
  }, [playbackSource, setPlaybackSource])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (!currentTrack) return;

    const artwork = currentTrack.thumbnail
      ? [
          { src: currentTrack.thumbnail, sizes: '96x96', type: 'image/jpeg' },
          { src: currentTrack.thumbnail, sizes: '128x128', type: 'image/jpeg' },
          { src: currentTrack.thumbnail, sizes: '192x192', type: 'image/jpeg' },
          { src: currentTrack.thumbnail, sizes: '256x256', type: 'image/jpeg' },
          { src: currentTrack.thumbnail, sizes: '384x384', type: 'image/jpeg' },
          { src: currentTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' },
        ]
      : [
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
        ];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title || "Unknown Title",
      artist: currentTrack.artist || "Unknown Artist",
      album: currentTrack.album || "Joelify",
      artwork,
    });

    const safePlay = () => {
      if (!isPlaying) handlePlayPause();
    };

    const safePause = () => {
      if (isPlaying) handlePlayPause();
    };

    try {
      navigator.mediaSession.setActionHandler('play', safePlay);
      navigator.mediaSession.setActionHandler('pause', safePause);
      navigator.mediaSession.setActionHandler('previoustrack', handlePrevious);
      navigator.mediaSession.setActionHandler('nexttrack', handleNext);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          handleSeek([details.seekTime]);
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        handleSeek([Math.max(0, currentTime - offset)]);
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        handleSeek([Math.min(duration || 0, currentTime + offset)]);
      });
      navigator.mediaSession.setActionHandler('stop', safePause);
    } catch (e) {
      console.warn("MediaSession setActionHandler error:", e);
    }

    return () => {
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('stop', null);
      } catch (e) {}
    };
  }, [
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    handlePlayPause,
    handlePrevious,
    handleNext,
    handleSeek,
  ]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;
    if (duration > 0 && Number.isFinite(duration) && Number.isFinite(currentTime)) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: 1,
          position: Math.min(Math.max(0, currentTime), duration),
        });
      } catch (e) {}
    }
  }, [currentTime, duration]);

  const saveToListeningHistory = useCallback((track: typeof currentTrack) => {
    if (!track) return

    // 1. Maintain 15-day raw history for charts & recent
    const now = new Date();
    const fifteenDaysAgo = now.getTime() - 15 * 24 * 60 * 60 * 1000;
    
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem("listening_history") || "[]");
    } catch(e) {}
    
    // Filter old entries
    history = history.filter((h: any) => new Date(h.playedAt).getTime() > fifteenDaysAgo);
    
    // Add current
    history.push({
      id: track.id, title: track.title, artist: track.artist,
      thumbnail: track.thumbnail, duration: duration || 0,
      playedAt: now.toISOString(), source: playbackSource,
    })
    
    if (history.length > 2000) history = history.slice(-2000); // safety cap
    localStorage.setItem("listening_history", JSON.stringify(history))

    // 2. Aggregate all-time stats memory
    let allTimeStats = { totalPlays: 0, totalTime: 0, trackPlays: {} as any, artistPlays: {} as any };
    try {
      const storedStats = localStorage.getItem("listening_stats_all_time");
      if (storedStats) allTimeStats = JSON.parse(storedStats);
    } catch (e) {}

    allTimeStats.totalPlays += 1;
    allTimeStats.totalTime += (duration || 0);

    const trackKey = `${track.id}-${track.title}`;
    if (!allTimeStats.trackPlays[trackKey]) {
      allTimeStats.trackPlays[trackKey] = { 
        track: { id: track.id, title: track.title, artist: track.artist }, 
        count: 0 
      };
    }
    allTimeStats.trackPlays[trackKey].count += 1;

    allTimeStats.artistPlays[track.artist] = (allTimeStats.artistPlays[track.artist] || 0) + 1;

    localStorage.setItem("listening_stats_all_time", JSON.stringify(allTimeStats));

  }, [duration, playbackSource])

  useEffect(() => {
    if (currentTrack && isPlaying && currentTime > 5) saveToListeningHistory(currentTrack)
  }, [currentTrack, isPlaying, currentTime, saveToListeningHistory])

  // Keyboard shortcuts
  useEffect(() => {
    if (playbackSource === "suno" && sunoAudioRef.current) {
      const audio = sunoAudioRef.current;
      const onTimeUpdate = () => {
        if (!isSeekingRef.current) {
          const ct = audio.currentTime;
          currentTimeRef.current = ct;
          currentTimeMotion.set(ct);
          if (Math.abs(ct - lastReactTimeRef.current) >= 1.0) {
            lastReactTimeRef.current = ct;
            setCurrentTime(ct);
            setPlaybackPosition(ct);
          }
        }
      };
      const onLoadedMetadata = () => {
        setDuration(audio.duration);
        setIsReady(true);
        if (initialLoadHandledRef.current && isPlaying) {
            const playPromise = audio.play();
            if (playPromise !== undefined) playPromise.catch(e => console.warn("Initial Suno play rejected:", e));
        }
      };
      const onPlay = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);
      const onEnded = () => {
        if (!trackEndHandledRef.current) {
          trackEndHandledRef.current = true;
          handleNext();
        }
      };
      
      audio.addEventListener("timeupdate", onTimeUpdate);
      audio.addEventListener("loadedmetadata", onLoadedMetadata);
      audio.addEventListener("ended", onEnded);
      audio.addEventListener("play", onPlay);
      audio.addEventListener("pause", onPause);

      return () => {
        audio.removeEventListener("timeupdate", onTimeUpdate);
        audio.removeEventListener("loadedmetadata", onLoadedMetadata);
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("play", onPlay);
        audio.removeEventListener("pause", onPause);
      };
    }
  }, [playbackSource, currentTrack, isPlaying, handleNext, setCurrentTime, setPlaybackPosition, setDuration, setIsReady]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        (target.closest && (target.closest("input") || target.closest("textarea") || target.closest("[contenteditable='true']")))
      ) return

      const key = e.key?.toLowerCase() || ""
      const code = e.code?.toLowerCase() || ""

      // Previous song: F7, MediaTrackPrevious, or 'p'
      if (key === "f7" || code === "f7" || key === "mediatrackprevious" || key === "p") {
        e.preventDefault()
        handlePrevious()
        return
      }

      // Play / Pause: F8, MediaPlayPause, MediaPlay, MediaPause, or Space
      if (key === "f8" || code === "f8" || key === "mediaplaypause" || key === "mediaplay" || key === "mediapause" || key === " ") {
        e.preventDefault()
        handlePlayPause()
        return
      }

      // Next song: F9, MediaTrackNext, or 'n'
      if (key === "f9" || code === "f9" || key === "mediatracknext" || key === "n") {
        e.preventDefault()
        handleNext()
        return
      }

      switch (key) {
        case "arrowright": e.preventDefault(); handleSeekForward(); break
        case "arrowleft": e.preventDefault(); handleSeekBackward(); break
        case "arrowup": e.preventDefault(); handleVolumeChange([Math.min(100, volume + 5)]); break
        case "arrowdown": e.preventDefault(); handleVolumeChange([Math.max(0, volume - 5)]); break
        case "m": e.preventDefault(); toggleMute(); break
        case "s": e.preventDefault(); toggleShuffle(); break
        case "r": e.preventDefault(); toggleRepeat(); break
        case "v": e.preventDefault(); setBarVideoMode((v) => !v); break
        case "l": e.preventDefault(); setLyricsOpen(!isLyricsOpen); break
        case "q": e.preventDefault(); setQueueOpen(!isQueueOpen); break
      }
    }
    
    window.addEventListener("keydown", handleKeyDown)
    return () => {
        window.removeEventListener("keydown", handleKeyDown)
    }
  }, [handlePlayPause, handleSeekForward, handleSeekBackward, handleNext, handlePrevious,
    volume, handleVolumeChange, toggleMute, toggleShuffle, toggleRepeat, playbackSource, isLyricsOpen, isQueueOpen])

  const handleSleepTimerEnd = useCallback(() => {
    if (playbackSource === "youtube" && youtubePlayer) {
      try {
        youtubePlayer.pauseVideo()
      } catch (e) { console.warn(e) }
    } else if (playbackSource === "suno" && sunoAudioRef.current) {
      sunoAudioRef.current.pause()
    }
    setIsPlaying(false)
  }, [youtubePlayer, playbackSource])

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return "0:00"
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`
  }

  const getRepeatLabel = () =>
    repeat === "one" ? "Repeat One" : repeat === "all" ? "Repeat All" : "Repeat Off"

  const progressWidth = useTransform(currentTimeMotion, (time) => {
    return duration > 0 ? `${Math.min(100, Math.max(0, (time / duration) * 100))}%` : "0%"
  })

  // ─── mini player ─────────────────────────────────────────────────────────────

  if (isMiniPlayer) {
    return (
      <>
        <YouTubePlayer
          onPlayerReady={handleYouTubePlayerReady}
          onStateChange={handleYouTubeStateChange}
          onError={handleError}
          onDurationReady={handleYouTubeDurationReady}
          onTimeUpdate={handleYouTubeTimeUpdate}
          videoMode={barVideoMode}
          isPlaying={isPlaying}
          onCloseVideo={() => setBarVideoMode(false)}
        />
        <MiniPlayer
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onClose={closeMiniPlayer}
          onExpand={closeMiniPlayer}
        />
      </>
    )
  }

  // ─── render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Scroll-Snap Container ────────────────────────────────────────── */}
      <div
        ref={scrollContainerRef}
        className={`fixed inset-0 z-40 overflow-y-scroll snap-y snap-mandatory h-screen overscroll-behavior-y-contain ${
          isExpandedPlayer ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {/* Section 1: Collapsed mini-bar snap section */}
        <div className="relative snap-start min-h-screen w-full flex flex-col justify-end pb-[50px] lg:pb-0 pointer-events-none px-2 sm:px-4 lg:px-0">
          <YouTubePlayer
            onPlayerReady={handleYouTubePlayerReady}
            onStateChange={handleYouTubeStateChange}
            onError={handleError}
            onDurationReady={handleYouTubeDurationReady}
            onTimeUpdate={handleYouTubeTimeUpdate}
            videoMode={barVideoMode && !isExpandedPlayer}
            isPlaying={isPlaying}
          />

          <motion.div
            style={{ opacity: miniBarOpacity, pointerEvents: miniBarPointerEvents as any, x: trackX }}
            onPanStart={handlePanStart}
            onPan={handlePan}
            onPanEnd={handlePanEnd}
            onClick={handleBarClick}
            className="bottom-player-bar pointer-events-auto bg-black/85 md:bg-black/90 backdrop-blur-2xl border-t border-white/[0.08] text-white p-2 md:p-3 w-full cursor-pointer select-none touch-pan-y"
          >
          {/* ── Top Interactive Seeker Bar on Mini-Player (with hover timeframe display) ── */}
          <div
            ref={miniProgressRef}
            className="group/seeker absolute -top-2.5 left-0 right-0 h-5 cursor-pointer z-50 flex items-center px-0"
            onClick={(e) => {
              e.stopPropagation()
              handleMiniProgressClick(e)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseMove={handleMiniProgressHover}
            onMouseLeave={() => {
              setHoverTime(null)
              setHoverPercent(null)
              setHoverPos(null)
            }}
          >
            {/* Base track */}
            <div className="w-full h-[2.5px] group-hover/seeker:h-[6px] bg-white/15 overflow-hidden transition-all duration-150 relative">
              {/* Progress fill */}
              <motion.div
                className="h-full bg-primary relative transition-[width] duration-75 ease-linear"
                style={{ width: progressWidth }}
              >
                {/* Glow Thumb on hover */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md opacity-0 group-hover/seeker:opacity-100 transition-opacity" />
              </motion.div>

              {/* Hover preview marker */}
              {hoverPercent !== null && (
                <div
                  className="absolute top-0 bottom-0 bg-white/20 pointer-events-none"
                  style={{ left: 0, width: `${hoverPercent}%` }}
                />
              )}
            </div>

            {/* Hover Timestamp Tooltip */}
            {hoverTime !== null && hoverPos !== null && (
              <div
                className="absolute -top-7 px-2 py-0.5 rounded-md bg-zinc-950/95 border border-white/20 text-white text-[11px] font-mono shadow-2xl pointer-events-none -translate-x-1/2 z-50 whitespace-nowrap backdrop-blur-md"
                style={{ left: `${Math.max(28, Math.min(hoverPos, (typeof window !== 'undefined' ? window.innerWidth : 800) - 28))}px` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
          </div>

          {/* Mobile minimal mini player (<md) */}
          <div 
            className="md:hidden flex items-center justify-between gap-3 h-12 px-1 w-full"
          >
            <motion.div
              style={{ x: trackX }}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              {currentTrack ? (
                <>
                  {currentTrack.thumbnail ? (
                    <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-zinc-800 shadow-md">
                      <Image
                        src={currentTrack.thumbnail || "/placeholder.svg"}
                        width={44}
                        height={44}
                        alt={currentTrack.title || "Track"}
                        className={`w-full h-full object-cover ${isPlaying ? "ring-1 ring-primary/40" : ""}`}
                      />
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0">
                      <Music2 size={20} className="text-zinc-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-sm font-semibold text-white truncate leading-tight">
                        {currentTrack.title}
                      </p>
                      {playbackSource === "suno" && (
                        <span className="text-[9px] bg-violet-500/20 text-violet-300 px-1 py-0.2 rounded font-medium shrink-0">
                          Joel
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 truncate leading-tight mt-0.5">
                      {currentTrack.artist}
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-lg bg-zinc-800/80 border border-white/10 flex items-center justify-center shrink-0">
                    <Music2 size={20} className="text-zinc-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-400 truncate">No track playing</p>
                    <p className="text-xs text-zinc-600 truncate">Tap to browse music</p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* ONLY Play/Pause button on mobile right */}
            <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 text-white hover:text-primary hover:bg-white/10 rounded-full transition-transform active:scale-90"
                onClick={handlePlayPause}
                disabled={!currentTrack}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause fill="currentColor" size={22} />
                ) : (
                  <Play fill="currentColor" size={22} className="ml-0.5" />
                )}
              </Button>
            </div>
          </div>

          {/* Desktop full bar (>=md) */}
          <div className="hidden md:flex flex-row items-center justify-between gap-4">
            {/* Desktop: track info */}
            <div
              className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer rounded-lg p-2 hover:bg-primary/15 transition-colors duration-150"
              onClick={() => setIsExpandedPlayer(true)}
            >
              {currentTrack ? (
                <>
                  {currentTrack.thumbnail ? (
                    <Image
                      src={currentTrack.thumbnail || "/placeholder.svg"}
                      width={56}
                      height={56}
                      alt={currentTrack.title || "Track"}
                      className={`w-14 h-14 rounded-lg object-cover flex-shrink-0 ${isPlaying ? "ring-1 ring-primary/40 animate-pulse" : ""}`}
                    />
                  ) : (
                    <div className={`w-14 h-14 bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0 ${isPlaying ? "ring-1 ring-primary/40 animate-pulse" : ""}`}>
                      <span className="text-2xl text-zinc-500">♪</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-sm line-clamp-1">{currentTrack.title}</p>
                      {playbackSource === "suno" && (
                        <span className="text-[10px] bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded ml-1 flex-shrink-0">
                          Joel's Music
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-1">{currentTrack.artist}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl text-zinc-500">♪</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-zinc-500">No track playing</p>
                    <p className="text-xs text-zinc-600">Search for music to get started</p>
                  </div>
                </>
              )}
            </div>

            {/* Playback controls */}
            <div className="flex items-center justify-center flex-1 max-w-md gap-3 md:gap-4" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
              {/* Shuffle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={toggleShuffle}
                      disabled={!currentTrack}
                      aria-label="Toggle shuffle"
                      className={`h-10 w-10 transition-colors ${
                        shuffle ? "text-primary" : "text-zinc-400 hover:text-white hover:bg-primary/15"
                      }`}
                    >
                      <Shuffle size={20} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{shuffle ? "Shuffle On" : "Shuffle Off"}</p>
                  </TooltipContent>
                </Tooltip>

                {/* Previous */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handlePrevious}
                      disabled={!currentTrack}
                      aria-label="Previous"
                      className="h-10 w-10 text-zinc-400 hover:text-white hover:bg-primary/15 transition-colors"
                    >
                      <SkipBack size={20} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Previous</p>
                  </TooltipContent>
                </Tooltip>

                {/* Play/Pause */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      className="bg-white text-black rounded-full h-12 w-12 hover:scale-105 transform hover:bg-primary hover:text-white transition-all duration-150 shadow-lg shadow-primary/20 ring-2 ring-primary/20 disabled:opacity-50"
                      onClick={handlePlayPause}
                      disabled={!currentTrack}
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? (
                        <Pause fill="currentColor" size={22} />
                      ) : (
                        <Play fill="currentColor" size={22} className="ml-0.5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isPlaying ? "Pause" : "Play"}</p>
                  </TooltipContent>
                </Tooltip>

                {/* Next */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleNext}
                      disabled={!currentTrack}
                      aria-label="Next"
                      className="h-10 w-10 text-zinc-400 hover:text-white hover:bg-primary/15 transition-colors"
                    >
                      <SkipForward size={20} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Next</p>
                  </TooltipContent>
                </Tooltip>

                {/* Repeat */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={toggleRepeat}
                      disabled={!currentTrack}
                      aria-label={`Repeat: ${repeat}`}
                      className={`h-10 w-10 relative transition-colors ${
                        repeat !== "off"
                          ? "text-primary hover:text-primary hover:bg-primary/10"
                          : "text-zinc-400 hover:text-white hover:bg-primary/15"
                      }`}
                    >
                      {repeat === "one" ? <Repeat1 size={20} /> : <Repeat size={20} />}
                      {repeat !== "off" && (
                        <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{getRepeatLabel()}</p>
                  </TooltipContent>
                </Tooltip>

                {/* Video toggle */}
                {playbackSource === "youtube" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setBarVideoMode((v) => !v)}
                        disabled={!currentTrack}
                        aria-label={barVideoMode ? "Hide video" : "Show video"}
                        className={`h-10 w-10 transition-colors ${
                          barVideoMode ? "text-primary" : "text-zinc-400 hover:text-white hover:bg-primary/15"
                        }`}
                      >
                        {barVideoMode ? <Video size={20} /> : <Music size={20} />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{barVideoMode ? "Hide Video" : "Show Video"}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
            </div>

            {/* Desktop: right side controls */}
            <div className="flex items-center gap-2 flex-1 justify-end" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setLyricsOpen(!isLyricsOpen)}
                    disabled={!currentTrack}
                    aria-label="Lyrics"
                    className={`h-10 w-10 transition-colors ${isLyricsOpen ? "text-primary" : "text-zinc-400 hover:text-white hover:bg-primary/15"}`}
                  >
                    <Type size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Lyrics</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setQueueOpen(!isQueueOpen)}
                    className={`text-zinc-400 hover:text-white hover:bg-primary/15 h-10 w-10 relative transition-colors ${isQueueOpen ? "text-primary" : ""}`}
                    aria-label="Queue"
                  >
                    <List size={20} />
                    {queue.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-white text-xs h-4 w-4 flex items-center justify-center rounded-[6px]">
                        {queue.length}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Queue</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsMiniPlayer(true)}
                    className="text-zinc-400 hover:text-white hover:bg-primary/15 h-10 w-10 transition-colors"
                    disabled={!currentTrack}
                    aria-label="Mini player"
                  >
                    <Minimize2 size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Mini Player</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <SleepTimer onTimerEnd={handleSleepTimerEnd} isPlaying={isPlaying} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sleep Timer</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleMute}
                    className="text-zinc-400 hover:text-white hover:bg-primary/15 h-10 w-10 transition-colors"
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isMuted ? "Unmute" : "Mute"}</p>
                </TooltipContent>
              </Tooltip>

              <div className="w-24">
                <Slider value={[volume]} max={100} step={1} onValueChange={handleVolumeChange} aria-label="Volume" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Section 2: Expandable Player snap section */}
      <div className="snap-start h-screen w-full flex-shrink-0 relative pointer-events-auto">
        {currentTrack && (
          <ExpandablePlayer
            isExpanded={isExpandedPlayer}
            scrollProgress={isExpandedPlayer ? 1 : 0}
            vh={vh}
            onExpandChange={(expanded) => {
              if (expanded) openExpandedPlayer();
              else closeExpandedPlayer();
            }}
            currentTime={currentTime}
            currentTimeMotion={currentTimeMotion}
            isPlaying={isPlaying}
            duration={duration}
            volume={volume}
            shuffle={shuffle}
            repeat={repeat}
            onPlayPause={handlePlayPause}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onToggleShuffle={toggleShuffle}
            onToggleRepeat={toggleRepeat}
            onSeek={handleSeek}
            formatTime={formatTime}
            onVideoActiveChange={handleVideoActiveChange}
          />
        )}
      </div>
    </div>

    {/* ── Gesture-Driven Queue Sheet ─────────────────────────────── */}
    <AnimatePresence>
      {isQueueOpen && !isExpandedPlayer && (
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 1 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 80 || info.velocity.y > 400) {
              setQueueOpen(false)
            }
          }}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={springConfig}
          className="fixed inset-0 z-[60] sheet-surface bg-black/90 backdrop-blur-3xl flex flex-col pt-4 border-t border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex-shrink-0 flex items-center justify-between px-6 pb-3 border-b border-white/10 cursor-grab active:cursor-grabbing">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setQueueOpen(false)}
              className="text-white/70 hover:text-white rounded-full"
              aria-label="Close Queue"
            >
              <ChevronDown size={24} />
            </Button>
            <div className="w-12 h-1.5 bg-white/30 rounded-full" />
            <div className="text-xs font-semibold text-white/80">Up Next</div>
          </div>

          <div 
            className="flex-1 w-full max-w-2xl mx-auto overflow-hidden p-6 cursor-auto"
          >
            <QueueSheet onClose={() => setQueueOpen(false)} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* ── Gesture-Driven Lyrics Sheet ─────────────────────────────── */}
    <AnimatePresence>
      {isLyricsOpen && !isExpandedPlayer && (
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 1 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 100 || info.velocity.y > 400) {
              setLyricsOpen(false)
            }
          }}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={springConfig}
          className="fixed inset-0 z-[60] sheet-surface bg-black/90 backdrop-blur-3xl flex flex-col pt-4 border-t border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex-shrink-0 flex items-center justify-between px-6 pb-3 border-b border-white/10 cursor-grab active:cursor-grabbing">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLyricsOpen(false)}
              className="text-white/70 hover:text-white rounded-full"
              aria-label="Close Lyrics"
            >
              <ChevronDown size={24} />
            </Button>
            <div className="w-12 h-1.5 bg-white/30 rounded-full" />
            <div className="w-10" />
          </div>

          <div 
            className="flex-1 w-full max-w-5xl mx-auto overflow-hidden p-6 cursor-auto"
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <LyricsDisplay currentTime={currentTime} duration={duration} isPlaying={isPlaying} onSeek={handleSeek} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    {(playbackSource === "suno" || playbackSource === "local") && (
      <audio
        ref={sunoAudioRef}
        src={playbackSource === "local" ? (localFileUrl || undefined) : (offlineSunoUrl ? offlineSunoUrl : (currentTrack ? `https://cdn1.suno.ai/${currentTrack.id}.mp3` : undefined))}
        preload="auto"
        className="hidden"
      />
    )}
    </>
  )
}
