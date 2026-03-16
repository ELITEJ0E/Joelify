"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { isAuthenticated } from "@/lib/spotifyAuth"
import { LIKED_SONGS_PLAYLIST_ID } from "./LikedSongsView"

export function PlayerControls() {
  const {
    currentTrack, queue, volume, shuffle, repeat, playbackPosition,
    currentPlaylistId, playlists, playbackSource, spotifyPlayer,
    likedSongs,
    setSpotifyPlayer, setCurrentTrack, setQueue, setVolume, toggleShuffle,
    toggleRepeat, setPlaybackPosition, setPlaybackSource,
    audioSettings,
  } = useApp()

  const [youtubePlayer, setYoutubePlayer] = useState<any>(null)
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
  const playedTracksRef = useRef(new Set<string>())
  const playHistoryRef = useRef<string[]>([])

  // ─── helpers ────────────────────────────────────────────────────────────────

  const getContextTracks = useCallback(() => {
    if (currentPlaylistId === LIKED_SONGS_PLAYLIST_ID) return likedSongs
    if (currentPlaylistId) {
      return playlists.find((p) => p.id === currentPlaylistId)?.tracks ?? []
    }
    return []
  }, [currentPlaylistId, likedSongs, playlists])

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
      youtubePlayer.seekTo(0, true)
      youtubePlayer.playVideo()
      setIsPlaying(true)
      setTimeout(() => { trackEndHandledRef.current = false }, 1500)
    } else if (playbackSource === "spotify" && spotifyPlayer) {
      SpotifyPlayerControls.seek(spotifyPlayer, 0)
      SpotifyPlayerControls.play(spotifyPlayer)
      setIsPlaying(true)
      setShouldAutoPlaySpotify(true)
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
    if (currentTime > 3) {
      if (playbackSource === "youtube" && youtubePlayer) {
        youtubePlayer.seekTo(0, true); setCurrentTime(0); setPlaybackPosition(0)
      } else if (playbackSource === "spotify" && spotifyPlayer) {
        SpotifyPlayerControls.seek(spotifyPlayer, 0); setCurrentTime(0); setPlaybackPosition(0)
      }
      return
    }

    if (playHistoryRef.current.length > 1) {
      playHistoryRef.current.pop()
      const prevId = playHistoryRef.current[playHistoryRef.current.length - 1]
      const contextTracks = getContextTracks()
      const prevTrack = contextTracks.find((t: any) => t.id === prevId)
      if (prevTrack) {
        setCurrentTrack(prevTrack); setCurrentTime(0); setPlaybackPosition(0); return
      }
    }

    if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.seekTo(0, true)
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, 0)
    setCurrentTime(0); setPlaybackPosition(0)
  }, [
    youtubePlayer, spotifyPlayer, setCurrentTrack, setPlaybackPosition,
    currentTime, playbackSource, getContextTracks,
  ])

  // ─── play / pause ───────────────────────────────────────────────────────────

  const handlePlayPause = useCallback(() => {
    if (!currentTrack || !isReady) return
    if (playbackSource === "youtube") {
      if (!youtubePlayer) return
      isPlaying ? youtubePlayer.pauseVideo() : youtubePlayer.playVideo()
    } else if (playbackSource === "spotify") {
      if (!spotifyPlayer) return
      SpotifyPlayerControls.togglePlay(spotifyPlayer)
    }
  }, [youtubePlayer, spotifyPlayer, currentTrack, isReady, isPlaying, playbackSource])

  // ─── seek ────────────────────────────────────────────────────────────────────

  const handleSeekForward = useCallback(() => {
    if (!currentTrack || !isReady) return
    const newTime = Math.min(duration, currentTime + 5)
    if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.seekTo(newTime, true)
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, newTime * 1000)
    setCurrentTime(newTime); setPlaybackPosition(newTime)
  }, [youtubePlayer, spotifyPlayer, isReady, currentTrack, duration, currentTime, playbackSource, setPlaybackPosition])

  const handleSeekBackward = useCallback(() => {
    if (!currentTrack || !isReady) return
    const newTime = Math.max(0, currentTime - 5)
    if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.seekTo(newTime, true)
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, newTime * 1000)
    setCurrentTime(newTime); setPlaybackPosition(newTime)
  }, [youtubePlayer, spotifyPlayer, isReady, currentTrack, currentTime, playbackSource, setPlaybackPosition])

  const handleSeek = useCallback((value: number[]) => {
    if (!isReady) return
    const newTime = value[0]
    isSeekingRef.current = true
    if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.seekTo(newTime, true)
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, newTime * 1000)
    setCurrentTime(newTime); setPlaybackPosition(newTime)
    setTimeout(() => { isSeekingRef.current = false }, 300)
  }, [youtubePlayer, spotifyPlayer, isReady, setPlaybackPosition, playbackSource])

  // ─── volume ──────────────────────────────────────────────────────────────────

  const handleVolumeChange = useCallback((value: number[]) => {
    const v = value[0]
    setVolume(v)
    if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.setVolume(v)
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.setVolume(spotifyPlayer, v)
    setIsMuted(v === 0)
  }, [youtubePlayer, spotifyPlayer, setVolume, playbackSource])

  const toggleMute = useCallback(() => {
    if (playbackSource === "youtube" && youtubePlayer) {
      if (isMuted) { youtubePlayer.unMute(); youtubePlayer.setVolume(volume); setIsMuted(false) }
      else { youtubePlayer.mute(); setIsMuted(true) }
    } else if (playbackSource === "spotify" && spotifyPlayer) {
      if (isMuted) { SpotifyPlayerControls.setVolume(spotifyPlayer, volume); setIsMuted(false) }
      else { SpotifyPlayerControls.setVolume(spotifyPlayer, 0); setIsMuted(true) }
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
        if (youtubePlayer && audioSettings.youtubeQuality !== "audio") {
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
    setYoutubePlayer(playerInstance)
    setIsReady(true)
    if (playerInstance?.setVolume) {
      playerInstance.setVolume(volume)
      if (isMuted) playerInstance.mute()
    }
  }, [volume, isMuted])

  const handleYouTubeDurationReady = useCallback((d: number) => setDuration(d), [])

  // Called by ExpandablePlayer when its video player activates or deactivates.
  // When expanded video is ON  → mute the bar's audio player + hide bar video (avoid two sources)
  // When expanded video is OFF → unmute bar player (restore previous mute state)
  const handleVideoActiveChange = useCallback((videoActive: boolean) => {
    if (!youtubePlayer) return
    if (videoActive) {
      setBarVideoMode(false)   // hide bar iframe while expanded video is showing
      youtubePlayer.mute()
    } else {
      if (!isMuted) youtubePlayer.unMute()
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
      setCurrentTime(0); setPlaybackPosition(0); setDuration(0)
      hasRestoredPositionRef.current = false
      setIsPlaying(false); trackEndHandledRef.current = false
    } else {
      setDuration(0); setCurrentTime(0); setPlaybackPosition(0)
      setIsPlaying(false)
    }
  }, [currentTrack, setPlaybackPosition])

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
    const history = JSON.parse(localStorage.getItem("listening_history") || "[]")
    history.push({
      id: track.id, title: track.title, artist: track.artist,
      thumbnail: track.thumbnail, duration: duration || 0,
      playedAt: new Date().toISOString(), source: playbackSource,
    })
    if (history.length > 1000) history.shift()
    localStorage.setItem("listening_history", JSON.stringify(history))
  }, [duration, playbackSource])

  useEffect(() => {
    if (currentTrack && isPlaying && currentTime > 5) saveToListeningHistory(currentTrack)
  }, [currentTrack, isPlaying, currentTime, saveToListeningHistory])

  // Keyboard shortcuts — "v" key removed (video lives in expanded player only)
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
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handlePlayPause, handleSeekForward, handleSeekBackward, handleNext, handlePrevious,
    volume, handleVolumeChange, toggleMute, toggleShuffle, toggleRepeat])

  const handleSleepTimerEnd = useCallback(() => {
    if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.pauseVideo()
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.pause(spotifyPlayer)
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
      />
      <SpotifyPlayer onPlayerReady={handleSpotifyPlayerReady} onStateChange={handleSpotifyStateChange} onError={handleSpotifyError} />

      <ExpandablePlayer
        isExpanded={isExpandedPlayer}
        onExpandChange={setIsExpandedPlayer}
        currentTime={currentTime}
        isPlaying={isPlaying}
        volume={volume}
        onVideoActiveChange={handleVideoActiveChange}
      >
        <div className="flex flex-col items-center w-full gap-4">
          {/* Progress bar */}
          <div className="flex items-center gap-2 w-full max-w-2xl mx-auto">
            <span className="text-sm text-white/60 w-10 text-right">{formatTime(currentTime)}</span>
            <div className="flex-1">
              <Slider value={[currentTime]} max={duration > 0 ? duration : 1} step={0.1}
                onValueChange={handleSeek} disabled={!currentTrack || duration === 0 || !isReady} />
            </div>
            <span className="text-sm text-white/60 w-10">{formatTime(duration)}</span>
          </div>

          {/* Controls - unified design */}
          <TooltipProvider>
            <div className="flex items-center justify-center gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={toggleShuffle} disabled={!currentTrack}
                    className={`h-14 w-14 rounded-full ${shuffle ? "text-primary bg-primary/10" : "text-white/60 hover:text-white hover:bg-white/10"}`}>
                    <Shuffle size={24} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{shuffle ? "Shuffle On" : "Shuffle Off"}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={handlePrevious} disabled={!currentTrack}
                    className="h-14 w-14 rounded-full text-white/80 hover:text-white hover:bg-white/10">
                    <SkipBack size={28} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Previous</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" 
                    className="bg-white text-black rounded-full h-16 w-16 hover:scale-105 transition-all shadow-lg hover:bg-zinc-100"
                    onClick={handlePlayPause} disabled={!currentTrack || !isReady}>
                    {isPlaying ? 
                      <Pause fill="currentColor" size={32} className="stroke-[1.5]" /> : 
                      <Play fill="currentColor" size={32} className="stroke-[1.5] ml-0.5" />
                    }
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{isPlaying ? "Pause" : "Play"}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={handleNext} disabled={!currentTrack}
                    className="h-14 w-14 rounded-full text-white/80 hover:text-white hover:bg-white/10">
                    <SkipForward size={28} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Next</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={toggleRepeat} disabled={!currentTrack}
                    className={`h-14 w-14 rounded-full relative ${repeat !== "off" ? "text-primary bg-primary/10" : "text-white/60 hover:text-white hover:bg-white/10"}`}>
                    <Repeat size={24} />
                    {repeat === "one" && (
                      <span className="absolute text-xs font-bold bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center -top-1 -right-1">
                        1
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{repeat === "one" ? "Repeat One" : repeat === "all" ? "Repeat All" : "Repeat Off"}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </ExpandablePlayer>

      {/* ── Collapsed bar ─────────────────────────────────────────────────── */}
      <div className="bg-zinc-950 border-t border-zinc-800/60 text-white p-3 md:p-4 w-full">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">

          {/* Desktop: track info */}
          <div
            className="hidden md:flex items-center gap-4 flex-1 min-w-0 cursor-pointer rounded-lg p-2 hover:bg-white/5 transition-colors duration-150"
            onClick={() => setIsExpandedPlayer(true)}
          >
            {currentTrack ? (
              <>
                {currentTrack.thumbnail ? (
                  <Image src={currentTrack.thumbnail || "/placeholder.svg"} width={56} height={56}
                    alt={currentTrack.title || "Track"} className="w-14 h-14 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 bg-zinc-800 rounded flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl text-zinc-500">♪</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm line-clamp-1">{currentTrack.title}</p>
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
            <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
              onClick={() => setIsExpandedPlayer(true)}>
              {currentTrack ? (
                <>
                  {currentTrack.thumbnail ? (
                    <Image src={currentTrack.thumbnail || "/placeholder.svg"} width={48} height={48}
                      alt={currentTrack.title || "Track"} className="w-12 h-12 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-zinc-800 rounded flex items-center justify-center flex-shrink-0">
                      <span className="text-xl text-zinc-500">♪</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm line-clamp-1">{currentTrack.title}</p>
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
                    className="text-zinc-400 hover:text-white hover:bg-white/10 h-10 w-10 transition-colors"
                    aria-label="Show lyrics" disabled={!currentTrack}>
                    <Type size={20} />
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:w-96">
                  <SheetHeader><SheetTitle>Lyrics</SheetTitle></SheetHeader>
                  <div className="mt-6 h-[calc(100vh-8rem)]">
                    <LyricsDisplay currentTime={currentTime} isPlaying={isPlaying} />
                  </div>
                </SheetContent>
              </Sheet>

              <Sheet>
                <SheetTrigger asChild>
                  <Button size="icon" variant="ghost"
                    className="text-zinc-400 hover:text-white hover:bg-white/10 h-10 w-10 relative transition-colors"
                    aria-label="Open queue">
                    <List size={20} />
                    {queue.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                        {queue.length}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:w-96">
                  <SheetHeader><SheetTitle>Queue</SheetTitle></SheetHeader>
                  <div className="mt-6 h-[calc(100vh-8rem)]"><QueueSheet /></div>
                </SheetContent>
              </Sheet>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" onClick={handleSwitch}
                      className={`h-10 w-10 transition-colors ${!isSpotifyAuth && playbackSource === "youtube" ? "text-zinc-600" : playbackSource === "youtube" ? "text-primary" : "text-zinc-400 hover:text-white hover:bg-white/10"}`}
                      disabled={!currentTrack || (!isSpotifyAuth && playbackSource === "youtube")}>
                      {playbackSource === "youtube" ? <Music2 size={20} /> : <Youtube size={20} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{playbackSource === "youtube" ? "Switch to Spotify" : "Switch to YouTube"}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button size="icon" variant="ghost" onClick={() => setIsExpandedPlayer(true)}
                className="text-zinc-400 hover:text-white hover:bg-white/10 h-10 w-10 transition-colors"
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
                  disabled={!currentTrack || duration === 0 || !isReady}
                  aria-label="Seek"
                  key={`slider-${currentTrack?.id}-${Math.floor(currentTime)}`}
                />
              </div>
              <span className="text-xs text-zinc-500 w-10">{formatTime(duration)}</span>
            </div>

            <TooltipProvider>
              <div className="flex items-center justify-center w-full gap-3 md:gap-4 mb-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" onClick={toggleShuffle} disabled={!currentTrack}
                      aria-label="Toggle shuffle"
                      className={`h-10 w-10 transition-colors ${
                        shuffle 
                          ? "text-primary" 
                          : "text-zinc-400 hover:text-white hover:bg-white/10"
                      }`}>
                      <Shuffle size={20} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{shuffle ? "Shuffle On" : "Shuffle Off"}</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" onClick={handlePrevious} disabled={!currentTrack}
                      aria-label="Previous"
                      className="h-12 w-12 text-white hover:text-white hover:bg-primary/80 transition-colors rounded-full">
                      <SkipBack size={24} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Previous</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon"
                      className="bg-white text-black rounded-full h-14 w-14 hover:scale-105 hover:bg-primary hover:text-white transition-all shadow-md disabled:opacity-50"
                      onClick={handlePlayPause} disabled={!currentTrack || !isReady}
                      aria-label={isPlaying ? "Pause" : "Play"}>
                      {isPlaying ? 
                        <Pause fill="currentColor" size={28} className="stroke-[1.5]" /> : 
                        <Play fill="currentColor" size={28} className="stroke-[1.5] ml-0.5" />
                      }
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isPlaying ? "Pause" : "Play"}</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" onClick={handleNext} disabled={!currentTrack}
                      aria-label="Next"
                      className="h-12 w-12 text-white hover:text-white hover:bg-primary/80 transition-colors rounded-full">
                      <SkipForward size={24} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Next</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" onClick={toggleRepeat} disabled={!currentTrack}
                      aria-label={`Repeat: ${repeat}`}
                      className={`h-10 w-10 relative transition-colors ${
                        repeat !== "off" 
                          ? "text-primary" 
                          : "text-zinc-400 hover:text-white hover:bg-white/10"
                      }`}>
                      <Repeat size={20} />
                      {repeat === "one" && (
                        <span className="absolute text-[10px] font-bold bottom-1.5 right-1.5">1</span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{getRepeatLabel()}</p>
                  </TooltipContent>
                </Tooltip>

                {/* Video toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost"
                      onClick={() => setBarVideoMode((v) => !v)}
                      disabled={!currentTrack}
                      aria-label={barVideoMode ? "Hide video" : "Show video"}
                      className={`h-10 w-10 transition-colors ${
                        barVideoMode 
                          ? "text-primary" 
                          : "text-zinc-400 hover:text-white hover:bg-white/10"
                      }`}>
                      {barVideoMode ? <Video size={20} /> : <Music size={20} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{barVideoMode ? "Hide Video" : "Show Video"}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>

          {/* Desktop: right side controls */}
          <div className="hidden md:flex items-center gap-2 flex-1 justify-end">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost"
                  className="text-zinc-400 hover:text-white hover:bg-white/10 h-10 w-10 rounded-full relative transition-all"
                  aria-label="Queue">
                  <List size={18} />
                  {queue.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                      {queue.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-96">
                <SheetHeader><SheetTitle>Queue</SheetTitle></SheetHeader>
                <div className="mt-6 h-[calc(100vh-8rem)]"><QueueSheet /></div>
              </SheetContent>
            </Sheet>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={handleSwitch}
                    className={`h-10 w-10 rounded-full transition-all ${
                      !isSpotifyAuth && playbackSource === "youtube" 
                        ? "text-zinc-600" 
                        : playbackSource === "youtube" 
                          ? "text-primary bg-primary/10 hover:bg-primary/20" 
                          : "text-zinc-400 hover:text-white hover:bg-white/10"
                    }`}
                    disabled={!currentTrack || (!isSpotifyAuth && playbackSource === "youtube")}>
                    {playbackSource === "youtube" ? <Music2 size={18} /> : <Youtube size={18} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">{playbackSource === "youtube" ? "Switch to Spotify" : "Switch to YouTube"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={() => setIsMiniPlayer(true)}
                    className="text-zinc-400 hover:text-white hover:bg-white/10 h-10 w-10 rounded-full transition-all"
                    disabled={!currentTrack} aria-label="Mini player">
                    <Minimize2 size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Mini Player</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <SleepTimer onTimerEnd={handleSleepTimerEnd} isPlaying={isPlaying} />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={toggleMute}
                    className="text-zinc-400 hover:text-white hover:bg-white/10 h-10 w-10 rounded-full transition-all"
                    aria-label={isMuted ? "Unmute" : "Mute"}>
                    {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">{isMuted ? "Unmute" : "Mute"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="w-24">
              <Slider value={[volume]} max={100} step={1} onValueChange={handleVolumeChange} aria-label="Volume" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
