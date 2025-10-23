"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, VolumeX, List, Music, Video } from "lucide-react"
import Image from "next/image"
import { useApp } from "@/contexts/AppContext"
import { YouTubePlayer } from "./YouTubePlayer"
import { QueueSheet } from "./QueueSheet"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
  const [isReady, setIsReady] = useState(false)

  const isSeekingRef = useRef(false)
  const hasRestoredPositionRef = useRef(false)
  const lastPlayerStateRef = useRef<number>(-1)
  const playedTracksRef = useRef(new Set<string>())
  const playHistoryRef = useRef<string[]>([])

  const handleDurationReady = useCallback((validDuration: number) => {
    console.log("[SyncFix] Duration ready in PlayerControls:", validDuration)
    setDuration(validDuration)
  }, [])

  const handleTimeUpdate = useCallback(
    (currentTime: number, duration: number) => {
      if (!isSeekingRef.current) {
        setCurrentTime(currentTime)
        setPlaybackPosition(currentTime)

        // Update duration if it changed
        setDuration((prevDuration) => {
          if (Math.abs(prevDuration - duration) > 1) {
            console.log("[SyncFix] Duration updated:", duration)
            return duration
          }
          return prevDuration
        })
      }
    },
    [setPlaybackPosition],
  )

  const handleNext = useCallback(() => {
    console.log(
      "[Player] handleNext called - repeat:",
      repeat,
      "queue length:",
      queue.length,
      "currentTrack:",
      currentTrack?.title,
    )

    if (player) {
      player.pauseVideo()
    }
    setIsPlaying(false)

    if (repeat === "one" && currentTrack) {
      console.log("[Player] Repeat one - replaying current track")
      if (player) {
        player.seekTo(0, true)
        setTimeout(() => {
          player.playVideo()
        }, 100)
        setCurrentTime(0)
        setPlaybackPosition(0)
      }
      return
    }

    if (queue.length > 0) {
      const nextTrack = queue[0]
      console.log("[Player] Playing next from queue:", nextTrack.title)
      setCurrentTrack(nextTrack)
      setQueue(queue.slice(1))
      setCurrentTime(0)
      setPlaybackPosition(0)
      if (currentTrack) {
        playedTracksRef.current.add(currentTrack.id)
        playHistoryRef.current.push(currentTrack.id)
      }
      return
    }

    if (repeat === "all" && currentPlaylistId) {
      const currentPlaylist = playlists.find((p) => p.id === currentPlaylistId)
      if (currentPlaylist && currentPlaylist.tracks.length > 0) {
        let nextTrack: typeof currentTrack = null

        if (shuffle) {
          const recentlyPlayed = playHistoryRef.current.slice(-Math.min(3, currentPlaylist.tracks.length - 1))
          const availableTracks = currentPlaylist.tracks.filter((t) => !recentlyPlayed.includes(t.id))

          if (availableTracks.length === 0) {
            playHistoryRef.current = []
            playedTracksRef.current.clear()
            const randomTracks = [...currentPlaylist.tracks]
            for (let i = randomTracks.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1))
              ;[randomTracks[i], randomTracks[j]] = [randomTracks[j], randomTracks[i]]
            }
            nextTrack = randomTracks[0]
          } else {
            nextTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)]
          }
        } else {
          const currentIndex = currentPlaylist.tracks.findIndex((t) => t.id === currentTrack?.id)
          const nextIndex = (currentIndex + 1) % currentPlaylist.tracks.length
          nextTrack = currentPlaylist.tracks[nextIndex]
        }

        if (nextTrack) {
          console.log("[Player] Playing next from playlist:", nextTrack.title)
          setCurrentTrack(nextTrack)
          setCurrentTime(0)
          setPlaybackPosition(0)
          if (currentTrack) {
            playedTracksRef.current.add(currentTrack.id)
            playHistoryRef.current.push(currentTrack.id)
          }
        }
      }
      return
    }

    console.log("[Player] End of playback, stopping")
    setIsPlaying(false)
    setCurrentTime(0)
    setPlaybackPosition(0)
    if (player) {
      player.pauseVideo()
    }
  }, [
    player,
    setIsPlaying,
    setCurrentTime,
    setPlaybackPosition,
    queue,
    setQueue,
    currentTrack,
    setCurrentTrack,
    repeat,
    shuffle,
    currentPlaylistId,
    playlists,
  ])

  const handleError = useCallback(
    (event: any) => {
      console.error("[Player] YouTube Error:", event.data)
      if ([2, 5, 100, 101, 150].includes(event.data)) {
        console.log("[Player] Video unplayable, skipping to next")
        setTimeout(() => handleNext(), 1000)
      }
    },
    [handleNext],
  )

  const handlePlayerReady = useCallback(
    (playerInstance: any) => {
      console.log("[SyncFix] Player instance ready in PlayerControls")
      setPlayer(playerInstance)
      setIsReady(true)

      if (playerInstance && typeof playerInstance.setVolume === "function") {
        playerInstance.setVolume(volume)
        if (isMuted) {
          playerInstance.mute()
        }
      }
    },
    [volume, isMuted],
  )

  const handlePrevious = useCallback(() => {
    if (currentTime > 3) {
      if (player) {
        player.seekTo(0, true)
        setCurrentTime(0)
        setPlaybackPosition(0)
      }
    } else {
      if (playHistoryRef.current.length > 1) {
        playHistoryRef.current.pop()
        const previousTrackId = playHistoryRef.current[playHistoryRef.current.length - 1]

        if (currentPlaylistId) {
          const currentPlaylist = playlists.find((p) => p.id === currentPlaylistId)
          const previousTrack = currentPlaylist?.tracks.find((t) => t.id === previousTrackId)

          if (previousTrack) {
            setCurrentTrack(previousTrack)
            setCurrentTime(0)
            setPlaybackPosition(0)
            return
          }
        }
      }

      if (player) {
        player.seekTo(0, true)
        setCurrentTime(0)
        setPlaybackPosition(0)
      }
    }
  }, [player, setCurrentTime, setPlaybackPosition, currentTrack, setCurrentTrack, currentPlaylistId, playlists])

  const handleSeekForward = useCallback(() => {
    if (!player || !isReady || !currentTrack) return
    const newTime = Math.min(duration, currentTime + 5)
    if (player) {
      player.seekTo(newTime, true)
      setCurrentTime(newTime)
      setPlaybackPosition(newTime)
    }
  }, [player, isReady, currentTrack, duration, currentTime])

  const handleSeekBackward = useCallback(() => {
    if (!player || !isReady || !currentTrack) return
    const newTime = Math.max(0, currentTime - 5)
    if (player) {
      player.seekTo(newTime, true)
      setCurrentTime(newTime)
      setPlaybackPosition(newTime)
    }
  }, [player, isReady, currentTrack, duration, currentTime])

  const handleSeek = useCallback(
    (value: number[]) => {
      if (!player || !isReady) return

      const newTime = value[0]
      isSeekingRef.current = true

      console.log("[SyncFix] Seeking to:", newTime)
      player.seekTo(newTime, true)
      setCurrentTime(newTime)
      setPlaybackPosition(newTime)

      setTimeout(() => {
        isSeekingRef.current = false
        console.log("[SyncFix] Seek complete")
      }, 300)
    },
    [player, isReady, setPlaybackPosition],
  )

  const handleVolumeChange = useCallback(
    (value: number[]) => {
      const newVolume = value[0]
      setVolume(newVolume)
      if (player) {
        player.setVolume(newVolume)
      }
      if (newVolume === 0) {
        setIsMuted(true)
      } else {
        setIsMuted(false)
      }
    },
    [player, setVolume, setIsMuted],
  )

  const toggleMute = useCallback(() => {
    if (player) {
      if (isMuted) {
        player.unMute()
        player.setVolume(volume)
        setIsMuted(false)
      } else {
        player.mute()
        setIsMuted(true)
      }
    }
  }, [player, isMuted, volume, setIsMuted])

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getRepeatLabel = () => {
    if (repeat === "one") return "Repeat One"
    if (repeat === "all") return "Repeat All"
    return "Repeat Off"
  }

  useEffect(() => {
    if (currentTrack) {
      console.log("[SyncFix] Track changed:", currentTrack.title)
      setCurrentTime(0)
      setPlaybackPosition(0)
      setDuration(0) // Reset duration, will be set by YouTubePlayer
      hasRestoredPositionRef.current = false
      setIsPlaying(false)
    } else {
      setDuration(0)
      setCurrentTime(0)
      setPlaybackPosition(0)
      hasRestoredPositionRef.current = false
      setIsPlaying(false)
    }
  }, [currentTrack, setPlaybackPosition])

  const handleStateChange = useCallback(
    (event: any) => {
      const playerState = event.data
      console.log("[SyncFix] State changed in PlayerControls:", playerState)

      lastPlayerStateRef.current = playerState

      switch (playerState) {
        case 1: // PLAYING
          console.log("[SyncFix] Video is playing")
          setIsPlaying(true)
          break

        case 2: // PAUSED
          console.log("[SyncFix] Video is paused")
          setIsPlaying(false)
          if (player && typeof player.getCurrentTime === "function") {
            const time = player.getCurrentTime()
            setCurrentTime(time)
            setPlaybackPosition(time)
          }
          break

        case 0: // ENDED
          console.log("[SyncFix] Video ended")
          setIsPlaying(false)
          setCurrentTime(0)
          setPlaybackPosition(0)
          setTimeout(() => handleNext(), 100)
          break

        case -1: // UNSTARTED
          console.log("[SyncFix] Video unstarted")
          setIsPlaying(false)
          break
      }
    },
    [player, setPlaybackPosition],
  )

  const handlePlayPause = useCallback(() => {
    if (!player || !currentTrack || !isReady) {
      console.log("[SyncFix] Cannot play/pause - player:", !!player, "track:", !!currentTrack, "ready:", isReady)
      return
    }

    console.log("[SyncFix] Play/Pause clicked - currently playing:", isPlaying)

    if (isPlaying) {
      player.pauseVideo()
    } else {
      player.playVideo()
      console.log("[SyncFix] Play command executed")
    }
  }, [player, currentTrack, isReady, isPlaying])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.code) {
        case "Space":
          e.preventDefault()
          handlePlayPause()
          break

        case "ArrowUp":
          e.preventDefault()
          handleVolumeChange([Math.min(100, volume + 10)])
          break

        case "ArrowDown":
          e.preventDefault()
          handleVolumeChange([Math.max(0, volume - 10)])
          break

        case "KeyV":
          e.preventDefault()
          toggleVideoMode()
          break

        case "KeyM":
          e.preventDefault()
          toggleMute()
          break

        case "ArrowRight":
          e.preventDefault()
          handleSeekForward()
          break

        case "ArrowLeft":
          e.preventDefault()
          handleSeekBackward()
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    player,
    isReady,
    currentTrack,
    volume,
    isPlaying,
    handlePlayPause,
    handleVolumeChange,
    toggleVideoMode,
    toggleMute,
    handleSeekForward,
    handleSeekBackward,
  ])

  return (
    <>
      <YouTubePlayer
        onPlayerReady={handlePlayerReady}
        onStateChange={handleStateChange}
        onError={handleError}
        onDurationReady={handleDurationReady}
        onTimeUpdate={handleTimeUpdate}
      />

      <div className="bg-black text-white p-3 md:p-4 border-border">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
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

          <div className="flex flex-col items-center w-full md:flex-1 md:max-w-2xl">
            <div className="md:hidden w-full flex items-center justify-between mb-3">
              {currentTrack ? (
                <>
                  {currentTrack.thumbnail ? (
                    <Image
                      src={currentTrack.thumbnail || "/placeholder.svg"}
                      width={48}
                      height={48}
                      alt={currentTrack.title || "Track thumbnail"}
                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-secondary rounded flex items-center justify-center flex-shrink-0">
                      <span className="text-xl text-muted-foreground">♪</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm line-clamp-1">{currentTrack.title}</p>
                    <p className="text-xs text-gray-400 line-clamp-1">{currentTrack.artist}</p>
                  </div>
                </>
              ) : (
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">No track playing</p>
                </div>
              )}
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-gray-400 hover:text-white relative h-10 w-10"
                    aria-label="Open queue"
                  >
                    <List size={20} />
                    {queue.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
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

            <div className="flex items-center gap-2 w-full mb-3 md:mb-0 md:order-2">
              <span className="text-xs text-gray-400 w-10 text-right">{formatTime(currentTime)}</span>
              <div className="flex-1">
                <Slider
                  value={[currentTime]}
                  max={duration > 0 ? duration : 1}
                  step={0.1}
                  onValueChange={handleSeek}
                  disabled={!currentTrack || duration === 0 || !isReady}
                  aria-label="Seek"
                  key={`slider-${currentTrack?.id}-${Math.floor(currentTime)}`}
                />
              </div>
              <span className="text-xs text-gray-400 w-10">{formatTime(duration)}</span>
            </div>

            <TooltipProvider>
              <div className="flex flex-col items-center justify-center w-full mb-4 md:mb-0">
                <div className="flex items-center justify-center w-full gap-3 md:gap-4 mb-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={toggleShuffle}
                        className={`h-10 w-10 ${shuffle ? "text-primary" : "text-gray-400 hover:text-white"}`}
                        disabled={!currentTrack}
                        aria-label="Toggle shuffle"
                      >
                        <Shuffle size={20} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{shuffle ? "Shuffle On" : "Shuffle Off"}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handlePrevious}
                        className="h-10 w-10 text-gray-400 hover:text-white"
                        disabled={!currentTrack}
                        aria-label="Previous track"
                      >
                        <SkipBack size={22} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Previous</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        className="bg-white text-black rounded-full h-12 w-12 hover:scale-105 transition disabled:opacity-50"
                        onClick={handlePlayPause}
                        disabled={!currentTrack || !isReady}
                        aria-label={isPlaying ? "Pause" : "Play"}
                      >
                        {isPlaying ? <Pause fill="currentColor" size={24} /> : <Play fill="currentColor" size={24} />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isPlaying ? "Pause" : "Play"}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleNext}
                        className="h-10 w-10 text-gray-400 hover:text-white"
                        disabled={!currentTrack}
                        aria-label="Next track"
                      >
                        <SkipForward size={22} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Next</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={toggleRepeat}
                        className={`h-10 w-10 relative ${repeat !== "off" ? "text-primary" : "text-gray-400 hover:text-white"}`}
                        disabled={!currentTrack}
                        aria-label={`Repeat: ${repeat}`}
                      >
                        <Repeat size={20} />
                        {repeat === "one" && <span className="absolute text-[10px] font-bold">1</span>}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getRepeatLabel()}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={toggleVideoMode}
                        className={`h-10 w-10 ${videoMode ? "text-primary" : "text-gray-400 hover:text-white"}`}
                        disabled={!currentTrack}
                        aria-label={videoMode ? "Switch to music mode" : "Switch to video mode"}
                      >
                        {videoMode ? <Video size={20} /> : <Music size={20} />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{videoMode ? "Hide Video" : "Show Video"}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </TooltipProvider>
          </div>

          <div className="hidden md:flex items-center mb-6 gap-4 flex-1 justify-end">
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

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleMute}
                    className="text-gray-400 hover:text-white"
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isMuted ? "Unmute" : "Mute"}</p>
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
