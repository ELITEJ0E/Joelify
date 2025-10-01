"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, VolumeX, List, Music, Video } from "lucide-react"
import Image from "next/image"
import { useApp } from "@/contexts/AppContext"
import { YouTubePlayer } from "./YouTubePlayer"
import { QueueSheet } from "./QueueSheet"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export function PlayerControls() {
  const {
    currentTrack,
    queue,
    volume,
    shuffle,
    repeat,
    playbackPosition,
    videoMode,
    currentPlaylistId,
    playlists,
    setCurrentTrack,
    setQueue,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    setPlaybackPosition,
    toggleVideoMode,
  } = useApp()

  const [player, setPlayer] = useState<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const playedTracksRef = useRef<Set<string>>(new Set())

  // Handle player ready
  const handlePlayerReady = (playerInstance: any) => {
    console.log("[v0] Player instance ready")
    setPlayer(playerInstance)
    if (playerInstance && typeof playerInstance.setVolume === "function") {
      playerInstance.setVolume(volume)
    }
  }

  // Handle player state changes
  const handleStateChange = (event: any) => {
    console.log("[v0] Player state changed:", event.data)
    const playerState = event.data

    // YT.PlayerState: UNSTARTED (-1), ENDED (0), PLAYING (1), PAUSED (2), BUFFERING (3), CUED (5)
    if (playerState === 1) {
      // Playing
      setIsPlaying(true)
      if (player && typeof player.getDuration === "function") {
        const actualDuration = player.getDuration()
        if (actualDuration && actualDuration > 0) {
          setDuration(actualDuration)
        }
      }
      startProgressTracking()
    } else if (playerState === 2) {
      // Paused
      setIsPlaying(false)
      stopProgressTracking()
    } else if (playerState === 0) {
      // Ended
      setIsPlaying(false)
      stopProgressTracking()
      handleNext()
    }
  }

  const startProgressTracking = () => {
    if (progressIntervalRef.current) return

    progressIntervalRef.current = setInterval(() => {
      if (player && typeof player.getCurrentTime === "function") {
        const time = player.getCurrentTime()
        setCurrentTime(time)
        setPlaybackPosition(time)
      }
    }, 500)
  }

  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProgressTracking()
    }
  }, [])

  // Restore playback position when track loads
  useEffect(() => {
    if (player && currentTrack && playbackPosition > 0 && typeof player.seekTo === "function") {
      player.seekTo(playbackPosition, true)
    }
  }, [currentTrack])

  // Play/Pause
  const handlePlayPause = () => {
    if (!player || !currentTrack) return

    if (isPlaying && typeof player.pauseVideo === "function") {
      player.pauseVideo()
    } else if (!isPlaying && typeof player.playVideo === "function") {
      player.playVideo()
    }
  }

  const handleNext = () => {
    // Repeat one: replay current track
    if (repeat === "one" && currentTrack) {
      if (player && typeof player.seekTo === "function" && typeof player.playVideo === "function") {
        player.seekTo(0)
        player.playVideo()
      }
      return
    }

    // If queue has tracks, play next from queue
    if (queue.length > 0) {
      const nextTrack = queue[0]
      setCurrentTrack(nextTrack)
      setQueue(queue.slice(1))
      setCurrentTime(0)
      setPlaybackPosition(0)
      if (currentTrack) {
        playedTracksRef.current.add(currentTrack.id)
      }
      return
    }

    // Repeat all: get next track from current playlist
    if (repeat === "all" && currentPlaylistId) {
      const currentPlaylist = playlists.find((p) => p.id === currentPlaylistId)
      if (currentPlaylist && currentPlaylist.tracks.length > 0) {
        let nextTrack: typeof currentTrack = null

        if (shuffle) {
          // Smart shuffle: avoid recently played tracks
          const availableTracks = currentPlaylist.tracks.filter((t) => !playedTracksRef.current.has(t.id))

          if (availableTracks.length === 0) {
            // All tracks played, reset and pick random
            playedTracksRef.current.clear()
            nextTrack = currentPlaylist.tracks[Math.floor(Math.random() * currentPlaylist.tracks.length)]
          } else {
            // Pick random from unplayed tracks
            nextTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)]
          }
        } else {
          // Sequential play
          const currentIndex = currentPlaylist.tracks.findIndex((t) => t.id === currentTrack?.id)
          const nextIndex = (currentIndex + 1) % currentPlaylist.tracks.length
          nextTrack = currentPlaylist.tracks[nextIndex]
        }

        if (nextTrack) {
          setCurrentTrack(nextTrack)
          setCurrentTime(0)
          setPlaybackPosition(0)
          if (currentTrack) {
            playedTracksRef.current.add(currentTrack.id)
          }
        }
      }
    }
  }

  const handlePrevious = () => {
    if (currentTime > 3) {
      // If more than 3 seconds in, restart current track
      if (player && typeof player.seekTo === "function") {
        player.seekTo(0)
        setCurrentTime(0)
      }
    } else {
      // Restart current track (previous track history not implemented)
      if (player && typeof player.seekTo === "function") {
        player.seekTo(0)
      }
    }
  }

  const handleSeek = (value: number[]) => {
    if (!player || typeof player.seekTo !== "function") return
    const newTime = value[0]
    player.seekTo(newTime, true)
    setCurrentTime(newTime)
    setPlaybackPosition(newTime)
  }

  // Volume
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    if (player && typeof player.setVolume === "function") {
      player.setVolume(newVolume)
    }
    if (newVolume === 0) {
      setIsMuted(true)
    } else {
      setIsMuted(false)
    }
  }

  const toggleMute = () => {
    if (player) {
      if (isMuted) {
        if (typeof player.unMute === "function" && typeof player.setVolume === "function") {
          player.unMute()
          player.setVolume(volume)
          setIsMuted(false)
        }
      } else {
        if (typeof player.mute === "function") {
          player.mute()
          setIsMuted(true)
        }
      }
    }
  }

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <>
      <YouTubePlayer onPlayerReady={handlePlayerReady} onStateChange={handleStateChange} />

      <div className="bg-black text-white p-3 md:p-4 border-t border-border">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
          {/* Current track info */}
          <div className="hidden md:flex items-center gap-4 flex-1 min-w-0">
            {currentTrack ? (
              <>
                {currentTrack.thumbnail ? (
                  <Image
                    src={currentTrack.thumbnail || "/placeholder.svg"}
                    width={56}
                    height={56}
                    alt={currentTrack.title || "Track thumbnail"}
                    className="w-14 h-14 rounded object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 bg-secondary rounded flex items-center justify-center">
                    <span className="text-2xl text-muted-foreground">♪</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm line-clamp-1">{currentTrack.title}</p>
                  <p className="text-xs text-gray-400 line-clamp-1">{currentTrack.artist}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-secondary rounded flex items-center justify-center">
                  <span className="text-2xl text-muted-foreground">♪</span>
                </div>
                <div>
                  <p className="font-semibold text-sm text-muted-foreground">No track playing</p>
                  <p className="text-xs text-gray-400">Search for music to get started</p>
                </div>
              </>
            )}
          </div>

          {/* Playback controls */}
          <div className="flex flex-col items-center gap-2 w-full md:flex-1 md:max-w-2xl">
            <div className="flex items-center gap-2 md:gap-4">
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleShuffle}
                className={`h-8 w-8 md:h-10 md:w-10 ${shuffle ? "text-primary" : "text-gray-400 hover:text-white"}`}
                disabled={!currentTrack}
                aria-label="Toggle shuffle"
              >
                <Shuffle size={18} className="md:w-5 md:h-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handlePrevious}
                className="h-8 w-8 md:h-10 md:w-10 text-gray-400 hover:text-white"
                disabled={!currentTrack}
                aria-label="Previous track"
              >
                <SkipBack size={18} className="md:w-5 md:h-5" />
              </Button>
              <Button
                size="icon"
                className="bg-white text-black rounded-full h-10 w-10 hover:scale-105 transition disabled:opacity-50"
                onClick={handlePlayPause}
                disabled={!currentTrack}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause fill="currentColor" size={20} /> : <Play fill="currentColor" size={20} />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleNext}
                className="h-8 w-8 md:h-10 md:w-10 text-gray-400 hover:text-white"
                disabled={!currentTrack && queue.length === 0}
                aria-label="Next track"
              >
                <SkipForward size={18} className="md:w-5 md:h-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleRepeat}
                className={`h-8 w-8 md:h-10 md:w-10 relative ${repeat !== "off" ? "text-primary" : "text-gray-400 hover:text-white"}`}
                disabled={!currentTrack}
                aria-label={`Repeat: ${repeat}`}
              >
                <Repeat size={18} className="md:w-5 md:h-5" />
                {repeat === "one" && <span className="absolute text-[10px] font-bold">1</span>}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleVideoMode}
                className={`h-8 w-8 md:h-10 md:w-10 ${videoMode ? "text-primary" : "text-gray-400 hover:text-white"}`}
                disabled={!currentTrack}
                aria-label={videoMode ? "Switch to music mode" : "Switch to video mode"}
              >
                {videoMode ? (
                  <Video size={18} className="md:w-5 md:h-5" />
                ) : (
                  <Music size={18} className="md:w-5 md:h-5" />
                )}
              </Button>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2 w-full">
              <span className="text-xs text-gray-400 w-10 text-right">{formatTime(currentTime)}</span>
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="flex-1"
                disabled={!currentTrack}
                aria-label="Seek"
              />
              <span className="text-xs text-gray-400 w-10">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume and queue */}
          <div className="hidden md:flex items-center gap-4 flex-1 justify-end">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-gray-400 hover:text-white relative"
                  aria-label="Open queue"
                >
                  <List size={20} />
                  {queue.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {queue.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-96">
                <SheetHeader>
                  <SheetTitle>Queue</SheetTitle>
                </SheetHeader>
                <div className="mt-6 h-[calc(100vh-8rem)]">
                  <QueueSheet />
                </div>
              </SheetContent>
            </Sheet>

            <Button
              size="icon"
              variant="ghost"
              onClick={toggleMute}
              className="text-gray-400 hover:text-white"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </Button>
            <div className="w-24">
              <Slider value={[volume]} max={100} step={1} onValueChange={handleVolumeChange} aria-label="Volume" />
            </div>
          </div>

          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-gray-400 hover:text-white relative"
                  aria-label="Open queue"
                >
                  <List size={20} />
                  {queue.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {queue.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:w-96">
                <SheetHeader>
                  <SheetTitle>Queue</SheetTitle>
                </SheetHeader>
                <div className="mt-6 h-[calc(100vh-8rem)]">
                  <QueueSheet />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </>
  )
}
