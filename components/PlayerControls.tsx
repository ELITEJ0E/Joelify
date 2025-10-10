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
  
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const playedTracksRef = useRef<Set<string>>(new Set())
  const playHistoryRef = useRef<string[]>([])
  const isSeekingRef = useRef(false)
  const hasRestoredPositionRef = useRef(false)
  const lastPlayerStateRef = useRef<number>(-1)

  // Debug effects
  useEffect(() => {
    console.log("[Player] Progress update - currentTime:", currentTime, "isPlaying:", isPlaying, "hasRAF:", !!animationFrameRef.current)
  }, [currentTime, isPlaying])

  useEffect(() => {
    console.log("[Player State] isPlaying:", isPlaying, "hasRAF:", !!animationFrameRef.current, "currentTime:", currentTime.toFixed(1), "duration:", duration)
  }, [isPlaying, currentTime, duration])

  // Parse duration string to seconds
  function parseDuration(durationStr: string): number {
    if (!durationStr) return 0
    const parts = durationStr.split(":").map(Number).reverse()
    let seconds = 0
    if (parts[0] !== undefined) seconds += parts[0]
    if (parts[1] !== undefined) seconds += parts[1] * 60
    if (parts[2] !== undefined) seconds += parts[2] * 3600
    return seconds
  }

  // Set initial duration from track when currentTrack changes
  useEffect(() => {
    if (currentTrack) {
      const parsedDur = parseDuration(currentTrack.duration)
      setDuration(parsedDur)
      setCurrentTime(0)
      setPlaybackPosition(0)
      hasRestoredPositionRef.current = false
      setIsPlaying(false)
      stopProgressTracking() // Stop any existing tracking
    } else {
      setDuration(0)
      setCurrentTime(0)
      setPlaybackPosition(0)
      hasRestoredPositionRef.current = false
      setIsPlaying(false)
      stopProgressTracking()
    }
  }, [currentTrack?.id, setPlaybackPosition])

  // Handle player ready
  const handlePlayerReady = (playerInstance: any) => {
    console.log("[Player] Player instance ready")
    setPlayer(playerInstance)
    setIsReady(true)
    
    if (playerInstance && typeof playerInstance.setVolume === "function") {
      playerInstance.setVolume(volume)
      if (isMuted) {
        playerInstance.mute()
      }
    }
  }

  // Handle initial playback when track changes
  useEffect(() => {
    if (player && isReady && currentTrack && !hasRestoredPositionRef.current) {
      console.log("[Player] New track loaded, ensuring progress tracking")
      
      // Small delay to ensure player is ready, then start progress tracking if playing
      const checkAndStartTracking = () => {
        if (player && typeof player.getPlayerState === "function") {
          const playerState = player.getPlayerState()
          console.log("[Player] Initial player state:", playerState)
          
          if (playerState === 1) { // Already playing
            setIsPlaying(true)
            startProgressTracking()
          }
        }
      }
      
      setTimeout(checkAndStartTracking, 500)
    }
  }, [player, isReady, currentTrack])

  // Get current time from player
  const updateCurrentTime = () => {
    if (player && typeof player.getCurrentTime === "function") {
      const time = player.getCurrentTime()
      setCurrentTime(time)
      setPlaybackPosition(time)
    }
  }

  // RequestAnimationFrame based progress tracking
  const startProgressTracking = () => {
    stopProgressTracking() // Clear any existing tracking
    
    console.log("[Player] Starting RAF progress tracking")
    
    const updateProgress = () => {
      if (
        player &&
        typeof player.getCurrentTime === "function" &&
        !isSeekingRef.current
      ) {
        try {
          const time = player.getCurrentTime()
          const playerState = player.getPlayerState?.()
          
          // Always try to get duration if we don't have it
          if ((duration === 0 || duration < 10) && typeof player.getDuration === "function") {
            const dur = player.getDuration()
            if (dur > 0) {
              console.log("[Player] Updating duration from player:", dur)
              setDuration(dur)
            }
          }
          
          // Only update time if player is actually playing (state 1)
          if (playerState === 1) {
            setCurrentTime(time)
            setPlaybackPosition(time)
            
            // MANUAL END DETECTION: Check if we're near the end of the video
            if (duration > 0 && time >= duration - 0.5) {
              console.log("[Player] Manual end detection triggered")
              setIsPlaying(false)
              stopProgressTracking()
              setCurrentTime(0)
              setPlaybackPosition(0)
              handleNext()
              return // Stop the animation loop
            }
          }
          
          // Continue animation loop regardless of state
          animationFrameRef.current = requestAnimationFrame(updateProgress)
        } catch (error) {
          console.error("[Player] Error in progress tracking:", error)
          stopProgressTracking()
        }
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(updateProgress)
  }

  const stopProgressTracking = () => {
    if (animationFrameRef.current) {
      console.log("[Player] Stopping RAF progress tracking")
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
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

  // Handle player state changes
  const handleStateChange = (event: any) => {
    const playerState = event.data
    console.log("[Player] State changed:", playerState, "currentTime:", currentTime)
    
    lastPlayerStateRef.current = playerState

    switch (playerState) {
      case 1: // PLAYING
        console.log("[Player] Video is playing, starting progress tracking")
        setIsPlaying(true)
        startProgressTracking()
        break
        
      case 2: // PAUSED
        console.log("[Player] Video is paused")
        setIsPlaying(false)
        // Update time one last time
        updateCurrentTime()
        stopProgressTracking()
        break
        
      case 0: // ENDED
        console.log("[Player] Video ended via YouTube API")
        setIsPlaying(false)
        stopProgressTracking()
        setCurrentTime(0)
        setPlaybackPosition(0)
        setTimeout(() => handleNext(), 100)
        break
        
      case 3: // BUFFERING
        console.log("[Player] Video buffering")
        // Don't change state, RAF will continue
        break
        
      case -1: // UNSTARTED
        console.log("[Player] Video unstarted")
        setIsPlaying(false)
        stopProgressTracking()
        break
        
      case 5: // CUED
        if (player && typeof player.getDuration === "function") {
          const actualDuration = player.getDuration()
          if (actualDuration > 0) {
            setDuration(actualDuration)
          }
        }
        break
    }
  }

  // Handle YouTube errors
  const handleError = (event: any) => {
    console.error("[Player] YouTube Error:", event.data)
    if ([2, 5, 100, 101, 150].includes(event.data)) {
      console.log("[Player] Video unplayable, skipping to next")
      setTimeout(() => handleNext(), 1000)
    }
  }

  // Restore playback position when track changes and player is ready
  useEffect(() => {
    if (player && isReady && currentTrack && playbackPosition > 0 && !hasRestoredPositionRef.current) {
      console.log("[Player] Restoring playback position:", playbackPosition)
      player.seekTo(playbackPosition, true)
      setCurrentTime(playbackPosition)
      hasRestoredPositionRef.current = true
    }
  }, [player, isReady, currentTrack, playbackPosition])

  // Verify player state function
  const verifyPlayerState = () => {
    if (player && typeof player.getPlayerState === "function") {
      const actualState = player.getPlayerState()
      console.log("[Player] Verified state:", actualState, "UI state:", isPlaying)
      
      if (actualState === 1 && !isPlaying) {
        console.log("[Player] State mismatch - player is playing but UI shows paused")
        setIsPlaying(true)
        startProgressTracking()
      } else if (actualState !== 1 && isPlaying) {
        console.log("[Player] State mismatch - player is not playing but UI shows playing")
        setIsPlaying(false)
      }
    }
  }

  // Play/Pause
  const handlePlayPause = () => {
    if (!player || !currentTrack || !isReady) {
      console.log("[Player] Cannot play/pause - player:", !!player, "track:", !!currentTrack, "ready:", isReady)
      return
    }

    console.log("[Player] Play/Pause clicked - currently playing:", isPlaying)
    
    if (isPlaying) {
      player.pauseVideo()
    } else {
      player.playVideo()
      console.log("[Player] Play command executed")
      // Double-check state after play
      setTimeout(verifyPlayerState, 300)
    }
  }

  const handleNext = () => {
    console.log("[Player] handleNext called - repeat:", repeat, "queue length:", queue.length, "currentTrack:", currentTrack?.title)
    
    // Stop any current playback first
    if (player) {
      player.pauseVideo()
    }
    stopProgressTracking()
    setIsPlaying(false)
    
    // Repeat one: replay current track
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

    // If queue has tracks, play next from queue
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

    // Repeat all: get next track from current playlist
    if (repeat === "all" && currentPlaylistId) {
      const currentPlaylist = playlists.find((p) => p.id === currentPlaylistId)
      if (currentPlaylist && currentPlaylist.tracks.length > 0) {
        let nextTrack: typeof currentTrack = null

        if (shuffle) {
          // Smart shuffle: avoid recently played tracks
          const recentlyPlayed = playHistoryRef.current.slice(-Math.min(3, currentPlaylist.tracks.length - 1))
          const availableTracks = currentPlaylist.tracks.filter((t) => !recentlyPlayed.includes(t.id))

          if (availableTracks.length === 0) {
            // All tracks recently played, reset and pick random
            playHistoryRef.current = []
            playedTracksRef.current.clear()
            const randomTracks = [...currentPlaylist.tracks]
            // Fisher-Yates shuffle
            for (let i = randomTracks.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [randomTracks[i], randomTracks[j]] = [randomTracks[j], randomTracks[i]]
            }
            nextTrack = randomTracks[0]
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

    // If no repeat and queue is empty, stop playback
    console.log("[Player] End of playback, stopping")
    setIsPlaying(false)
    setCurrentTime(0)
    setPlaybackPosition(0)
    if (player) {
      player.pauseVideo()
    }
  }

  const handlePrevious = () => {
    if (currentTime > 3) {
      // If more than 3 seconds in, restart current track
      if (player) {
        player.seekTo(0, true)
        setCurrentTime(0)
        setPlaybackPosition(0)
      }
    } else {
      // Go to previous track from history
      if (playHistoryRef.current.length > 1) {
        // Remove current track
        playHistoryRef.current.pop()
        const previousTrackId = playHistoryRef.current[playHistoryRef.current.length - 1]
        
        // Find track in current playlist
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
      
      // Fallback: restart current track
      if (player) {
        player.seekTo(0, true)
        setCurrentTime(0)
        setPlaybackPosition(0)
      }
    }
  }

  // Handle seek forward/backward
  const handleSeekForward = () => {
    if (!player || !isReady || !currentTrack) return
    const newTime = Math.min(duration, currentTime + 5)
    handleSeek([newTime])
  }

  const handleSeekBackward = () => {
    if (!player || !isReady || !currentTrack) return
    const newTime = Math.max(0, currentTime - 5)
    handleSeek([newTime])
  }

  const handleSeek = (value: number[]) => {
    if (!player || !isReady) return
    
    const newTime = value[0]
    isSeekingRef.current = true
    stopProgressTracking()
    
    console.log("[Player] Seeking to:", newTime)
    player.seekTo(newTime, true)
    setCurrentTime(newTime)
    setPlaybackPosition(newTime)
    
    // Restart progress tracking after a short delay
    setTimeout(() => {
      isSeekingRef.current = false
      if (lastPlayerStateRef.current === 1) { // Only restart if was playing
        startProgressTracking()
      }
    }, 500)
  }

  // Volume
  const handleVolumeChange = (value: number[]) => {
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
  }

  const toggleMute = () => {
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
  }

  // Format time
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Get repeat button label
  const getRepeatLabel = () => {
    if (repeat === "one") return "Repeat One"
    if (repeat === "all") return "Repeat All"
    return "Repeat Off"
  }

  // Handle keyboard events for seeking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.code === "ArrowRight") {
        e.preventDefault()
        handleSeekForward()
      }
      if (e.code === "ArrowLeft") {
        e.preventDefault()
        handleSeekBackward()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [player, isReady, currentTrack, currentTime, duration])

  return (
    <>
      <YouTubePlayer 
        onPlayerReady={handlePlayerReady} 
        onStateChange={handleStateChange}
        onError={handleError}
      />

      <div className="bg-black text-white p-3 md:p-4 border-t border-border">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
          {/* Current track info - Desktop */}
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
          <div className="flex flex-col items-center w-full md:flex-1 md:max-w-2xl">
            {/* Mobile layout - Track info and controls in one row */}
            <div className="md:hidden w-full flex items-center justify-between mb-3">
              {/* Track info on the left */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
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
              </div>

              {/* QueueSheet button on the right */}
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

            {/* Progress bar - Below track info for mobile */}
            <div className="flex items-center gap-2 w-full mb-3 md:mb-0 md:order-2">
              <span className="text-xs text-gray-400 w-10 text-right">
                {formatTime(currentTime)}
              </span>
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
              <span className="text-xs text-gray-400 w-10">
                {formatTime(duration)}
              </span>
            </div>

            {/* Main player controls */}
            <TooltipProvider>
              <div className="flex flex-col items-center justify-center w-full mb-4 md:mb-0">
                <div className="flex items-center justify-center w-full gap-3 md:gap-4 mb-2">
                  {/* Shuffle button */}
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

                  {/* Previous button */}
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

                  {/* Play/Pause button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        className="bg-white text-black rounded-full h-12 w-12 hover:scale-105 transition disabled:opacity-50"
                        onClick={handlePlayPause}
                        disabled={!currentTrack || !isReady}
                        aria-label={isPlaying ? "Pause" : "Play"}
                      >
                        {isPlaying ? (
                          <Pause fill="currentColor" size={24} />
                        ) : (
                          <Play fill="currentColor" size={24} />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isPlaying ? "Pause" : "Play"}</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Next button */}
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

                  {/* Repeat button */}
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
                        {repeat === "one" && (
                          <span className="absolute text-[10px] font-bold">1</span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getRepeatLabel()}</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Video button */}
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

          {/* Desktop Volume and queue */}
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
