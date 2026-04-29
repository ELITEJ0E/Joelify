"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle,
  Volume2, VolumeX, List, Youtube, Music2, Video, Music,
  Type, Minimize2, Maximize2,
} from "lucide-react"
import Image from "next/image"
import { useApp } from "@/contexts/AppContext"
import { YouTubePlayer } from "./YouTubePlayer"
import { SpotifyPlayer, SpotifyPlayerControls } from "./SpotifyPlayer"
import { QueueSheet } from "./QueueSheet"
import { LyricsDisplay } from "./LyricsDisplay"
import { MiniPlayer } from "./MiniPlayer"
import { SleepTimer } from "./SleepTimer"
import { ExpandablePlayer } from "./ExpandablePlayer"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { isAuthenticated } from "@/lib/spotifyAuth"
import { LIKED_SONGS_PLAYLIST_ID } from "./LikedSongsView"

export function PlayerControls() {
  const {
    currentTrack, queue, volume, shuffle, repeat, playbackPosition,
    currentPlaylistId, playlists, playbackSource, spotifyPlayer,
    likedSongs, joelsSongs,
    setSpotifyPlayer, setCurrentTrack, setQueue, setVolume, toggleShuffle,
    toggleRepeat, setPlaybackPosition, setPlaybackSource,
    audioSettings, user,
  } = useApp()

  // We check for isInitialized from context but it's not exported.
  // Actually, let's use isFirstRender better.
  const [youtubePlayer, setYoutubePlayer] = useState<any>(null)
  const sunoAudioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [isSpotifyAuth, setIsSpotifyAuth] = useState(false)
  const [shouldAutoPlaySpotify, setShouldAutoPlaySpotify] = useState(false)
  const [isMiniPlayer, setIsMiniPlayer] = useState(false)
  const [isExpandedPlayer, setIsExpandedPlayer] = useState(false)
  // Local video toggle for the bar — separate from expanded player's video
  const [barVideoMode, setBarVideoMode] = useState(false)

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
    } else if (playbackSource === "spotify" && spotifyPlayer) {
      SpotifyPlayerControls.seek(spotifyPlayer, 0)
      SpotifyPlayerControls.play(spotifyPlayer)
      setIsPlaying(true)
      setShouldAutoPlaySpotify(true)
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
  }, [currentTrack, youtubePlayer, spotifyPlayer, playbackSource, setPlaybackPosition])

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
      else if (playbackSource === "spotify") setShouldAutoPlaySpotify(true)
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
        else if (playbackSource === "spotify") setShouldAutoPlaySpotify(true)
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
      } else if (playbackSource === "spotify" && spotifyPlayer) {
        SpotifyPlayerControls.seek(spotifyPlayer, 0);
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
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, 0)
    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.currentTime = 0
    setCurrentTime(0); setPlaybackPosition(0)
  }, [
    youtubePlayer, spotifyPlayer, setCurrentTrack, setPlaybackPosition,
    currentTime, playbackSource, getContextTracks, currentTrack
  ])

  // ─── play / pause ───────────────────────────────────────────────────────────

  const handlePlayPause = useCallback(() => {
    if (!currentTrack) return
    if (!isReady && playbackSource !== "suno") return
    if (playbackSource === "youtube") {
      if (!youtubePlayer) return
      try {
        if (isPlaying && typeof youtubePlayer.pauseVideo === 'function') youtubePlayer.pauseVideo()
        else if (!isPlaying && typeof youtubePlayer.playVideo === 'function') youtubePlayer.playVideo()
      } catch (e) { console.warn("YT play/pause error", e) }
    } else if (playbackSource === "spotify") {
      if (!spotifyPlayer) return
      SpotifyPlayerControls.togglePlay(spotifyPlayer)
    } else if (playbackSource === "suno" && sunoAudioRef.current) {
      try {
        if (isPlaying) {
            sunoAudioRef.current.pause();
        } else {
            const playPromise = sunoAudioRef.current.play();
            if (playPromise !== undefined) playPromise.catch(e => console.warn("Suno play rejected:", e));
        }
        setIsPlaying(!isPlaying);
      } catch (e) {
          console.warn("Suno play/pause error", e);
      }
    }
  }, [youtubePlayer, spotifyPlayer, currentTrack, isReady, isPlaying, playbackSource])

  // ─── seek ────────────────────────────────────────────────────────────────────

  const handleSeekForward = useCallback(() => {
    if (!currentTrack || !isReady) return
    const newTime = Math.min(duration, currentTime + 5)
    if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.seekTo(newTime, true)
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, newTime * 1000)
    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.currentTime = newTime
    setCurrentTime(newTime); setPlaybackPosition(newTime)
  }, [youtubePlayer, spotifyPlayer, isReady, currentTrack, duration, currentTime, playbackSource, setPlaybackPosition])

  const handleSeekBackward = useCallback(() => {
    if (!currentTrack || !isReady) return
    const newTime = Math.max(0, currentTime - 5)
    if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.seekTo(newTime, true)
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, newTime * 1000)
    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.currentTime = newTime
    setCurrentTime(newTime); setPlaybackPosition(newTime)
  }, [youtubePlayer, spotifyPlayer, isReady, currentTrack, currentTime, playbackSource, setPlaybackPosition])

  const handleSeek = useCallback((value: number[]) => {
    if (!isReady) return
    const newTime = value[0]
    isSeekingRef.current = true
    if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.seekTo(newTime, true)
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, newTime * 1000)
    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.currentTime = newTime
    setCurrentTime(newTime); setPlaybackPosition(newTime)
    setTimeout(() => { isSeekingRef.current = false }, 300)
  }, [youtubePlayer, spotifyPlayer, isReady, setPlaybackPosition, playbackSource])

  // ─── volume ──────────────────────────────────────────────────────────────────

  const handleVolumeChange = useCallback((value: number[]) => {
    const v = value[0]
    setVolume(v)
    if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.setVolume(v)
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.setVolume(spotifyPlayer, v)
    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.volume = v / 100
    setIsMuted(v === 0)
  }, [youtubePlayer, spotifyPlayer, setVolume, playbackSource])

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
    } else if (playbackSource === "spotify" && spotifyPlayer) {
      if (isMuted) { SpotifyPlayerControls.setVolume(spotifyPlayer, volume); setIsMuted(false) }
      else { SpotifyPlayerControls.setVolume(spotifyPlayer, 0); setIsMuted(true) }
    } else if (playbackSource === "suno" && sunoAudioRef.current) {
      if (isMuted) { sunoAudioRef.current.volume = volume / 100; setIsMuted(false); }
      else { sunoAudioRef.current.volume = 0; setIsMuted(true); }
    }
  }, [youtubePlayer, spotifyPlayer, isMuted, volume, playbackSource])

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
        setIsPlaying(false)
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
      setCurrentTime(ct)
      setPlaybackPosition(ct)
      setDuration((prev) => Math.abs(prev - d) > 1 ? d : prev)
    }
  }, [setPlaybackPosition, playbackSource])

  // ─── Spotify callbacks ───────────────────────────────────────────────────────

  const handleSpotifyPlayerReady = useCallback((player: any) => {
    setSpotifyPlayer(player); setIsReady(true)
  }, [setSpotifyPlayer])

  const handleSpotifyStateChange = useCallback((state: any) => {
    if (playbackSource !== "spotify" || !state) return
    setCurrentTime(state.position / 1000)
    setPlaybackPosition(state.position / 1000)
    setIsPlaying(!state.paused)

    if (state.track_window?.current_track) {
      const t = state.track_window.current_track
      if (currentTrack?.id !== t.id) {
        setCurrentTrack({
          id: t.id, title: t.name,
          artist: t.artists.map((a: any) => a.name).join(", "),
          thumbnail: t.album.images[0]?.url || "",
          duration: `${Math.floor(state.duration / 60000)}:${String(Math.floor((state.duration % 60000) / 1000)).padStart(2, "0")}`,
        })
      }
    }

    const trackEnded = state.position >= state.duration - 1000 && state.duration > 0
    if ((trackEnded || (state.paused && state.position === 0 && state.duration > 0)) && !trackEndHandledRef.current) {
      trackEndHandledRef.current = true
      repeat === "one" ? handleRepeatOne() : handleNext()
    }
    if (!state.paused && trackEndHandledRef.current) trackEndHandledRef.current = false
  }, [playbackSource, currentTrack, setCurrentTrack, setPlaybackPosition, handleNext, repeat, handleRepeatOne])

  const handleSpotifyError = useCallback((error: any) => {
    console.error("[Spotify] Player error:", error)
  }, [])

  // ─── effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (currentTrack) {
      if (playbackSource === "suno" && !currentTrack.thumbnail?.includes("suno.ai") && !currentTrack.thumbnail?.includes("suno.com")) {
         setPlaybackSource("youtube");
      } else if (playbackSource === "youtube" && currentTrack.thumbnail?.includes("suno.ai")) {
         setPlaybackSource("suno");
      }
      // Set initial times
      setCurrentTime(0); setPlaybackPosition(0); setDuration(0)
      hasRestoredPositionRef.current = false
      trackEndHandledRef.current = false
      
      // Auto-play ONLY if it's not the very first load of a track
      if (initialLoadHandledRef.current) {
        setIsPlaying(true)
      }
      initialLoadHandledRef.current = true
    } else {
      setDuration(0); setCurrentTime(0); setPlaybackPosition(0)
      setIsPlaying(false)
    }
  }, [currentTrack, setPlaybackPosition, playbackSource, setPlaybackSource])

  useEffect(() => {
    setIsSpotifyAuth(isAuthenticated())
    if (!playbackSource) setPlaybackSource("youtube")
  }, [playbackSource, setPlaybackSource])

  useEffect(() => {
    if (!currentTrack || !spotifyPlayer || playbackSource !== "spotify" || !isReady || !shouldAutoPlaySpotify) return
    const playSpotifyTrack = async () => {
      try {
        let trackUri = currentTrack.id
        if (!trackUri.startsWith("spotify:track:")) trackUri = `spotify:track:${trackUri}`
        await SpotifyPlayerControls.play(spotifyPlayer, [trackUri])
        setIsPlaying(true); setShouldAutoPlaySpotify(false); trackEndHandledRef.current = false
      } catch (error) {
        console.error("[Spotify] Failed to auto-play:", error)
        setTimeout(() => { if (shouldAutoPlaySpotify) playSpotifyTrack() }, 1000)
      }
    }
    const timer = setTimeout(playSpotifyTrack, 500)
    return () => clearTimeout(timer)
  }, [currentTrack, spotifyPlayer, playbackSource, isReady, shouldAutoPlaySpotify])

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
          setCurrentTime(audio.currentTime);
          setPlaybackPosition(audio.currentTime);
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

      // Play audio if it was already supposed to be playing
      if (currentTrack && isPlaying && initialLoadHandledRef.current) {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.warn("Suno background play rejected:", e);
                setIsPlaying(false);
            });
        }
      }

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
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return
      switch (e.key.toLowerCase()) {
        case " ": e.preventDefault(); handlePlayPause(); break
        case "arrowright": e.preventDefault(); handleSeekForward(); break
        case "arrowleft": e.preventDefault(); handleSeekBackward(); break
        case "arrowup": e.preventDefault(); handleVolumeChange([Math.min(100, volume + 5)]); break
        case "arrowdown": e.preventDefault(); handleVolumeChange([Math.max(0, volume - 5)]); break
        case "m": e.preventDefault(); toggleMute(); break
        case "n": e.preventDefault(); handleNext(); break
        case "p": e.preventDefault(); handlePrevious(); break
        case "s": e.preventDefault(); toggleShuffle(); break
        case "r": e.preventDefault(); toggleRepeat(); break
        case "v": e.preventDefault(); setBarVideoMode((v) => !v); break
      }
    }
    
    window.addEventListener("keydown", handleKeyDown)
    return () => {
        window.removeEventListener("keydown", handleKeyDown)
    }
  }, [handlePlayPause, handleSeekForward, handleSeekBackward, handleNext, handlePrevious,
    volume, handleVolumeChange, toggleMute, toggleShuffle, toggleRepeat, playbackSource])

  const handleSleepTimerEnd = useCallback(() => {
    if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.pauseVideo()
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.pause(spotifyPlayer)
    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.pause()
    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.pause()
    setIsPlaying(false)
  }, [youtubePlayer, spotifyPlayer, playbackSource])

  const handleSwitch = () => {
    if (playbackSource === "youtube" && !isSpotifyAuth) { alert("Please login to Spotify first"); return }
    if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.pauseVideo()
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.pause(spotifyPlayer)
    setIsPlaying(false); setShouldAutoPlaySpotify(false)
    setPlaybackSource(playbackSource === "youtube" ? "spotify" : "youtube")
  }

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return "0:00"
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`
  }

  const getRepeatLabel = () =>
    repeat === "one" ? "Repeat One" : repeat === "all" ? "Repeat All" : "Repeat Off"

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
        />
        <SpotifyPlayer onPlayerReady={handleSpotifyPlayerReady} onStateChange={handleSpotifyStateChange} onError={handleSpotifyError} />
        <MiniPlayer
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onClose={() => setIsMiniPlayer(false)}
          onExpand={() => setIsMiniPlayer(false)}
        />
      </>
    )
  }

  // ─── render ──────────────────────────────────────────────────────────────────

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
      />
      <SpotifyPlayer onPlayerReady={handleSpotifyPlayerReady} onStateChange={handleSpotifyStateChange} onError={handleSpotifyError} />

      <ExpandablePlayer
        isExpanded={isExpandedPlayer}
        onExpandChange={setIsExpandedPlayer}
        currentTime={currentTime}
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

      {/* ── Collapsed bar ─────────────────────────────────────────────────── */}
      {!isExpandedPlayer && (
        <div className="bg-black/40 backdrop-blur-2xl border-t border-white/[0.07] text-white p-3 md:p-4 w-full z-50 relative">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">

          {/* Desktop: track info */}
          <div
            className="hidden md:flex items-center gap-4 flex-1 min-w-0 cursor-pointer rounded-lg p-2 hover:bg-primary/15 transition-colors duration-150"
            onClick={() => setIsExpandedPlayer(true)}
          >
            {currentTrack ? (
              <>
                {currentTrack.thumbnail ? (
                  <Image src={currentTrack.thumbnail || "/placeholder.svg"} width={56} height={56}
                    alt={currentTrack.title || "Track"} className={`w-14 h-14 rounded object-cover flex-shrink-0 ${isPlaying ? "ring-1 ring-primary/40 animate-pulse" : ""}`} />
                ) : (
                  <div className={`w-14 h-14 bg-zinc-800 rounded flex items-center justify-center flex-shrink-0 ${isPlaying ? "ring-1 ring-primary/40 animate-pulse" : ""}`}>
                    <span className="text-2xl text-zinc-500">♪</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="font-semibold text-sm line-clamp-1">{currentTrack.title}</p>
                    {playbackSource === "suno" && <span className="text-[10px] bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded ml-1 flex-shrink-0">Joel's Music</span>}
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-1">{currentTrack.artist}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-zinc-800 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl text-zinc-500">♪</span>
                </div>
                <div>
                  <p className="font-semibold text-sm text-zinc-500">No track playing</p>
                  <p className="text-xs text-zinc-600">Search for music to get started</p>
                </div>
              </>
            )}
          </div>

          {/* Mobile: track info + extras */}
          <div className="md:hidden w-full flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer rounded-lg p-1 hover:bg-primary/15 transition-colors duration-150"
              onClick={() => setIsExpandedPlayer(true)}>
              {currentTrack ? (
                <>
                  {currentTrack.thumbnail ? (
                    <Image src={currentTrack.thumbnail || "/placeholder.svg"} width={48} height={48}
                      alt={currentTrack.title || "Track"} className={`w-12 h-12 rounded object-cover flex-shrink-0 ${isPlaying ? "ring-1 ring-primary/40 animate-pulse" : ""}`} />
                  ) : (
                    <div className={`w-12 h-12 bg-zinc-800 rounded flex items-center justify-center flex-shrink-0 ${isPlaying ? "ring-1 ring-primary/40 animate-pulse" : ""}`}>
                      <span className="text-xl text-zinc-500">♪</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-sm line-clamp-1">{currentTrack.title}</p>
                      {playbackSource === "suno" && <span className="text-[10px] bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded ml-1 flex-shrink-0">Joel's Music</span>}
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-1">{currentTrack.artist}</p>
                  </div>
                </>
              ) : (
                <div className="flex-1"><p className="text-sm text-zinc-500">No track playing</p></div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Sheet>
                <SheetTrigger asChild>
                  <Button size="icon" variant="ghost"
                    className="text-zinc-400 hover:text-white hover:bg-primary/15 h-10 w-10 transition-colors"
                    aria-label="Show lyrics" disabled={!currentTrack}>
                    <Type size={20} />
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:w-96 bg-black/80 backdrop-blur-2xl border-white/[0.07]">
                  <SheetHeader><SheetTitle>Lyrics</SheetTitle></SheetHeader>
                  <div className="mt-6 h-[calc(100vh-8rem)]">
                    <LyricsDisplay currentTime={currentTime} isPlaying={isPlaying} />
                  </div>
                </SheetContent>
              </Sheet>

              <Sheet>
                <SheetTrigger asChild>
                  <Button size="icon" variant="ghost"
                    className="text-zinc-400 hover:text-white hover:bg-primary/15 h-10 w-10 relative transition-colors"
                    aria-label="Open queue">
                    <List size={20} />
                    {queue.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                        {queue.length}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:w-96 bg-black/80 backdrop-blur-2xl border-white/[0.07]">
                  <SheetHeader><SheetTitle>Queue</SheetTitle></SheetHeader>
                  <div className="mt-6 h-[calc(100vh-8rem)]"><QueueSheet /></div>
                </SheetContent>
              </Sheet>

              <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" onClick={handleSwitch}
                      className={`h-10 w-10 transition-colors ${!isSpotifyAuth && playbackSource === "youtube" ? "text-zinc-600" : playbackSource === "youtube" ? "text-primary" : "text-zinc-400 hover:text-white hover:bg-primary/15"}`}
                      disabled={!currentTrack || (!isSpotifyAuth && playbackSource === "youtube")}>
                      {playbackSource === "youtube" ? <Music2 size={20} /> : <Youtube size={20} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{playbackSource === "youtube" ? "Switch to Spotify" : "Switch to YouTube"}</p></TooltipContent>
                </Tooltip>

              <Button size="icon" variant="ghost" onClick={() => setIsExpandedPlayer(true)}
                className="text-zinc-400 hover:text-white hover:bg-primary/15 h-10 w-10 transition-colors"
                disabled={!currentTrack}>
                <Maximize2 size={20} />
              </Button>
            </div>
          </div>

          {/* Playback controls */}
          <div className="flex-col items-center w-full md:flex-1 md:max-w-2xl">
            <div className="flex items-center gap-2 w-full mb-3 md:mb-2">
              <span className="text-xs text-zinc-500 w-10 text-right">{formatTime(currentTime)}</span>
              <div className="flex-1">
                  <Slider value={[currentTime]} max={duration > 0 ? duration : 1} step={0.1}
                    onValueChange={handleSeek}
                    disabled={!currentTrack || duration === 0}
                    aria-label="Seek"
                  />
              </div>
              <span className="text-xs text-zinc-500 w-10">{formatTime(duration)}</span>
            </div>

            <div className="flex items-center justify-center w-full gap-3 md:gap-4 mb-2">
                {/* Shuffle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" onClick={toggleShuffle} disabled={!currentTrack}
                      aria-label="Toggle shuffle"
                      className={`h-10 w-10 transition-colors ${
                        shuffle 
                          ? "text-primary" 
                          : "text-zinc-400 hover:text-white hover:bg-primary/15"
                      }`}>
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
                    <Button size="icon" variant="ghost" onClick={handlePrevious} disabled={!currentTrack}
                      aria-label="Previous"
                      className="h-10 w-10 text-zinc-400 hover:text-white hover:bg-primary/15 transition-colors">
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
                    <Button size="icon"
                      className="bg-white text-black rounded-full h-14 w-14 hover:scale-105 transform hover:bg-primary hover:text-white transition-all duration-150 shadow-lg shadow-primary/20 ring-2 ring-primary/20 disabled:opacity-50"
                      onClick={handlePlayPause} disabled={!currentTrack || (!isReady && playbackSource !== "suno")}
                      aria-label={isPlaying ? "Pause" : "Play"}>
                      {isPlaying ? 
                        <Pause fill="currentColor" size={24} /> : 
                        <Play fill="currentColor" size={24} className="ml-0.5" />
                      }
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isPlaying ? "Pause" : "Play"}</p>
                  </TooltipContent>
                </Tooltip>

                {/* Next */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" onClick={handleNext} disabled={!currentTrack}
                      aria-label="Next"
                      className="h-10 w-10 text-zinc-400 hover:text-white hover:bg-primary/15 transition-colors">
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
                    <Button size="icon" variant="ghost" onClick={toggleRepeat} disabled={!currentTrack}
                      aria-label={`Repeat: ${repeat}`}
                      className={`h-10 w-10 relative transition-colors ${
                        repeat !== "off"
                          ? "text-primary hover:text-primary hover:bg-primary/10"
                          : "text-zinc-400 hover:text-white hover:bg-primary/15"
                      }`}>
                      {repeat === "one" ? <Repeat1 size={20} /> : <Repeat size={20} />}
                      {/* Active dot — same pattern as shuffle */}
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
                      <Button size="icon" variant="ghost"
                        onClick={() => setBarVideoMode((v) => !v)}
                        disabled={!currentTrack}
                        aria-label={barVideoMode ? "Hide video" : "Show video"}
                        className={`h-10 w-10 transition-colors ${
                          barVideoMode 
                            ? "text-primary" 
                            : "text-zinc-400 hover:text-white hover:bg-primary/15"
                        }`}>
                        {barVideoMode ? <Video size={20} /> : <Music size={20} />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{barVideoMode ? "Hide Video" : "Show Video"}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
          </div>

          {/* Desktop: right side controls */}
          <div className="hidden md:flex items-center gap-2 flex-1 justify-end">
              <Sheet>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SheetTrigger asChild>
                      <Button size="icon" variant="ghost"
                        className="text-zinc-400 hover:text-white hover:bg-primary/15 h-10 w-10 relative transition-colors"
                        aria-label="Queue">
                        <List size={20} />
                        {queue.length > 0 && (
                          <span className="absolute -top-1 -right-1 bg-primary text-white text-xs h-4 w-4 flex items-center justify-center rounded-[6px]">
                            {queue.length}
                          </span>
                        )}
                      </Button>
                    </SheetTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Queue</p>
                  </TooltipContent>
                </Tooltip>
                <SheetContent className="w-96 bg-black/80 backdrop-blur-2xl border-white/[0.07]">
                  <SheetHeader><SheetTitle>Queue</SheetTitle></SheetHeader>
                  <div className="mt-6 h-[calc(100vh-8rem)]"><QueueSheet /></div>
                </SheetContent>
              </Sheet>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={handleSwitch}
                    className={`h-10 w-10 transition-colors ${
                      !isSpotifyAuth && playbackSource === "youtube" 
                        ? "text-zinc-600" 
                        : playbackSource === "youtube" 
                          ? "text-primary" 
                          : "text-zinc-400 hover:text-white hover:bg-primary/15"
                    }`}
                    disabled={!currentTrack || (!isSpotifyAuth && playbackSource === "youtube")}>
                    {playbackSource === "youtube" ? <Music2 size={20} /> : <Youtube size={20} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{playbackSource === "youtube" ? "Switch to Spotify" : "Switch to YouTube"}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={() => setIsMiniPlayer(true)}
                    className="text-zinc-400 hover:text-white hover:bg-primary/15 h-10 w-10 transition-colors"
                    disabled={!currentTrack} aria-label="Mini player">
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
                  <Button size="icon" variant="ghost" onClick={toggleMute}
                    className="text-zinc-400 hover:text-white hover:bg-primary/15 h-10 w-10 transition-colors"
                    aria-label={isMuted ? "Unmute" : "Mute"}>
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
      </div>
    )}
      <audio
        ref={sunoAudioRef}
        src={playbackSource === "suno" && currentTrack ? `https://cdn1.suno.ai/${currentTrack.id}.mp3` : undefined}
        preload="auto"
        className="hidden"
      />
    </>
  )
}
