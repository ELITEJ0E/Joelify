"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, VolumeX, List, Music, Video, Youtube, Music2 } from "lucide-react"
import Image from "next/image"
import { useApp } from "@/contexts/AppContext"
import { YouTubePlayer } from "./YouTubePlayer"
import { SpotifyPlayer, SpotifyPlayerControls } from "./SpotifyPlayer"
import { QueueSheet } from "./QueueSheet"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { isAuthenticated } from "@/lib/spotifyAuth"

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
    playbackSource,
    spotifyPlayer,
    setSpotifyPlayer,
    setCurrentTrack,
    setQueue,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    setPlaybackPosition,
    toggleVideoMode,
    setPlaybackSource,
  } = useApp()

  const [youtubePlayer, setYoutubePlayer] = useState<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [isSpotifyAuth, setIsSpotifyAuth] = useState(false)

  const [spotifyState, setSpotifyState] = useState<any>(null)

  const isSeekingRef = useRef(false)
  const hasRestoredPositionRef = useRef(false)
  const lastPlayerStateRef = useRef<number>(-1)
  const playedTracksRef = useRef(new Set<string>())
  const playHistoryRef = useRef<string[]>([])

  // **NEW: Auto-play Spotify tracks when they change**
  useEffect(() => {
    if (!currentTrack || !spotifyPlayer || playbackSource !== "spotify" || !isReady) return

    const playSpotifyTrack = async () => {
      try {
        console.log("[Spotify] Auto-playing track:", currentTrack.title)
        
        // Ensure track ID is in correct format
        let trackUri = currentTrack.id
        if (!trackUri.startsWith('spotify:track:')) {
          trackUri = `spotify:track:${trackUri}`
        }

        console.log("[Spotify] Playing URI:", trackUri)

        // Play the track
        await SpotifyPlayerControls.play(spotifyPlayer, [trackUri])
        setIsPlaying(true)
        
      } catch (error) {
        console.error("[Spotify] Failed to auto-play track:", error)
      }
    }

    // Small delay to ensure player is ready
    const timer = setTimeout(() => {
      playSpotifyTrack()
    }, 300)

    return () => clearTimeout(timer)
  }, [currentTrack?.id, spotifyPlayer, playbackSource, isReady])

  const handleYouTubeDurationReady = useCallback((validDuration: number) => {
    console.log("[SyncFix] Duration ready in PlayerControls:", validDuration)
    setDuration(validDuration)
  }, [])

  const handleYouTubeTimeUpdate = useCallback(
    (currentTime: number, duration: number) => {
      if (!isSeekingRef.current && playbackSource === "youtube") {
        setCurrentTime(currentTime)
        setPlaybackPosition(currentTime)

        setDuration((prevDuration) => {
          if (Math.abs(prevDuration - duration) > 1) {
            console.log("[SyncFix] Duration updated:", duration)
            return duration
          }
          return prevDuration
        })
      }
    },
    [setPlaybackPosition, playbackSource],
  )

  const handleSpotifyPlayerReady = useCallback(
    (player: any) => {
      console.log("[Spotify] Player ready in PlayerControls")
      setSpotifyPlayer(player)
      setIsReady(true)
    },
    [setSpotifyPlayer],
  )

  const handleSpotifyStateChange = useCallback(
    (state: any) => {
      if (!state || playbackSource !== "spotify") return

      console.log("[Spotify] State changed:", state)
      setSpotifyState(state)
      setIsPlaying(!state.paused)
      setCurrentTime(state.position / 1000)
      setDuration(state.duration / 1000)
      setPlaybackPosition(state.position / 1000)

      if (state.track_window?.current_track) {
        const track = state.track_window.current_track
        if (currentTrack?.id !== track.id) {
          setCurrentTrack({
            id: track.id,
            title: track.name,
            artist: track.artists.map((a: any) => a.name).join(", "),
            thumbnail: track.album.images[0]?.url || "",
            duration: `${Math.floor(state.duration / 60000)}:${String(Math.floor((state.duration % 60000) / 1000)).padStart(2, "0")}`,
          })
        }
      }

      if (state.paused && state.position === 0 && state.duration > 0) {
        console.log("[Spotify] Track ended")
        setTimeout(() => handleNext(), 100)
      }
    },
    [playbackSource, currentTrack, setCurrentTrack, setPlaybackPosition],
  )

  const handleSpotifyError = useCallback((error: any) => {
    console.error("[Spotify] Player error:", error)
  }, [])

  const handleNext = useCallback(() => {
    if (playbackSource === "youtube" && youtubePlayer) {
      youtubePlayer.pauseVideo()
    } else if (playbackSource === "spotify" && spotifyPlayer) {
      SpotifyPlayerControls.pause(spotifyPlayer)
    }
    setIsPlaying(false)

    if (repeat === "one" && currentTrack) {
      if (playbackSource === "youtube" && youtubePlayer) {
        youtubePlayer.seekTo(0, true)
        setTimeout(() => youtubePlayer.playVideo(), 100)
      } else if (playbackSource === "spotify" && spotifyPlayer) {
        SpotifyPlayerControls.seek(spotifyPlayer, 0)
        setTimeout(() => SpotifyPlayerControls.play(spotifyPlayer), 100)
      }
      setCurrentTime(0)
      setPlaybackPosition(0)
      return
    }

    if (queue.length > 0) {
      const nextTrack = queue[0]
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

    setIsPlaying(false)
    setCurrentTime(0)
    setPlaybackPosition(0)
    if (playbackSource === "youtube" && youtubePlayer) {
      youtubePlayer.pauseVideo()
    } else if (playbackSource === "spotify" && spotifyPlayer) {
      SpotifyPlayerControls.pause(spotifyPlayer)
    }
  }, [
    youtubePlayer,
    spotifyPlayer,
    playbackSource,
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

  const handleYouTubePlayerReady = useCallback(
    (playerInstance: any) => {
      console.log("[SyncFix] Player instance ready in PlayerControls")
      setYoutubePlayer(playerInstance)
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
      if (playbackSource === "youtube" && youtubePlayer) {
        youtubePlayer.seekTo(0, true)
        setCurrentTime(0)
        setPlaybackPosition(0)
      } else if (playbackSource === "spotify" && spotifyPlayer) {
        SpotifyPlayerControls.seek(spotifyPlayer, 0)
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

      if (playbackSource === "youtube" && youtubePlayer) {
        youtubePlayer.seekTo(0, true)
        setCurrentTime(0)
        setPlaybackPosition(0)
      } else if (playbackSource === "spotify" && spotifyPlayer) {
        SpotifyPlayerControls.seek(spotifyPlayer, 0)
        setCurrentTime(0)
        setPlaybackPosition(0)
      }
    }
  }, [
    youtubePlayer,
    spotifyPlayer,
    setCurrentTime,
    setPlaybackPosition,
    currentTrack,
    setCurrentTrack,
    currentPlaylistId,
    playlists,
    playbackSource,
    currentTime,
  ])

  const handleSeekForward = useCallback(() => {
    if (!currentTrack || !isReady) return
    
    if (playbackSource === "youtube" && youtubePlayer) {
      const newTime = Math.min(duration, currentTime + 5)
      youtubePlayer.seekTo(newTime, true)
      setCurrentTime(newTime)
      setPlaybackPosition(newTime)
    } else if (playbackSource === "spotify" && spotifyPlayer) {
      const newTime = Math.min(duration, currentTime + 5)
      SpotifyPlayerControls.seek(spotifyPlayer, newTime * 1000)
      setCurrentTime(newTime)
      setPlaybackPosition(newTime)
    }
  }, [youtubePlayer, spotifyPlayer, isReady, currentTrack, duration, currentTime, playbackSource, setPlaybackPosition])

  const handleSeekBackward = useCallback(() => {
    if (!currentTrack || !isReady) return
    
    if (playbackSource === "youtube" && youtubePlayer) {
      const newTime = Math.max(0, currentTime - 5)
      youtubePlayer.seekTo(newTime, true)
      setCurrentTime(newTime)
      setPlaybackPosition(newTime)
    } else if (playbackSource === "spotify" && spotifyPlayer) {
      const newTime = Math.max(0, currentTime - 5)
      SpotifyPlayerControls.seek(spotifyPlayer, newTime * 1000)
      setCurrentTime(newTime)
      setPlaybackPosition(newTime)
    }
  }, [youtubePlayer, spotifyPlayer, isReady, currentTrack, currentTime, playbackSource, setPlaybackPosition])

  const handleSeek = useCallback(
    (value: number[]) => {
      if (!isReady) return

      const newTime = value[0]
      isSeekingRef.current = true

      if (playbackSource === "youtube" && youtubePlayer) {
        console.log("[SyncFix] Seeking to:", newTime)
        youtubePlayer.seekTo(newTime, true)
      } else if (playbackSource === "spotify" && spotifyPlayer) {
        console.log("[Spotify] Seeking to:", newTime)
        SpotifyPlayerControls.seek(spotifyPlayer, newTime * 1000)
      }

      setCurrentTime(newTime)
      setPlaybackPosition(newTime)

      setTimeout(() => {
        isSeekingRef.current = false
        console.log("[SyncFix] Seek complete")
      }, 300)
    },
    [youtubePlayer, spotifyPlayer, isReady, setPlaybackPosition, playbackSource],
  )

  const handleVolumeChange = useCallback(
    (value: number[]) => {
      const newVolume = value[0]
      setVolume(newVolume)
      
      if (playbackSource === "youtube" && youtubePlayer) {
        youtubePlayer.setVolume(newVolume)
      } else if (playbackSource === "spotify" && spotifyPlayer) {
        SpotifyPlayerControls.setVolume(spotifyPlayer, newVolume)
      }
      
      if (newVolume === 0) {
        setIsMuted(true)
      } else {
        setIsMuted(false)
      }
    },
    [youtubePlayer, spotifyPlayer, setVolume, setIsMuted, playbackSource],
  )

  const toggleMute = useCallback(() => {
    if (playbackSource === "youtube" && youtubePlayer) {
      if (isMuted) {
        youtubePlayer.unMute()
        youtubePlayer.setVolume(volume)
        setIsMuted(false)
      } else {
        youtubePlayer.mute()
        setIsMuted(true)
      }
    } else if (playbackSource === "spotify" && spotifyPlayer) {
      if (isMuted) {
        SpotifyPlayerControls.setVolume(spotifyPlayer, volume)
        setIsMuted(false)
      } else {
        SpotifyPlayerControls.setVolume(spotifyPlayer, 0)
        setIsMuted(true)
      }
    }
  }, [youtubePlayer, spotifyPlayer, isMuted, volume, setIsMuted, playbackSource])

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
      setDuration(0)
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

  useEffect(() => {
    setIsSpotifyAuth(isAuthenticated())
    if (!playbackSource) {
      setPlaybackSource("youtube")
    }
  }, [playbackSource, setPlaybackSource])

  const handleSwitch = () => {
    if (playbackSource === "youtube" && !isSpotifyAuth) {
      alert("Please login to Spotify first")
      return
    }
    
    // Pause current player before switching
    if (playbackSource === "youtube" && youtubePlayer) {
      youtubePlayer.pauseVideo()
    } else if (playbackSource === "spotify" && spotifyPlayer) {
      SpotifyPlayerControls.pause(spotifyPlayer)
    }
    
    setIsPlaying(false)
    setPlaybackSource(playbackSource === "youtube" ? "spotify" : "youtube")
  }

  const handleYouTubeStateChange = useCallback(
    (event: any) => {
      if (playbackSource !== "youtube") return

      const playerState = event.data
      console.log("[SyncFix] State changed in PlayerControls:", playerState)

      lastPlayerStateRef.current = playerState

      switch (playerState) {
        case 1:
          setIsPlaying(true)
          break
        case 2:
          setIsPlaying(false)
          if (youtubePlayer && typeof youtubePlayer.getCurrentTime === "function") {
            const time = youtubePlayer.getCurrentTime()
            setCurrentTime(time)
            setPlaybackPosition(time)
          }
          break
        case 0:
          setIsPlaying(false)
          setCurrentTime(0)
          setPlaybackPosition(0)
          setTimeout(() => handleNext(), 100)
          break
        case -1:
          setIsPlaying(false)
          break
      }
    },
    [youtubePlayer, setPlaybackPosition, playbackSource, handleNext],
  )

  const handlePlayPause = useCallback(() => {
    if (!currentTrack || !isReady) return

    if (playbackSource === "youtube") {
      if (!youtubePlayer) return
      if (isPlaying) {
        youtubePlayer.pauseVideo()
      } else {
        youtubePlayer.playVideo()
      }
    } else if (playbackSource === "spotify") {
      if (!spotifyPlayer) return
      SpotifyPlayerControls.togglePlay(spotifyPlayer)
    }
  }, [youtubePlayer, spotifyPlayer, currentTrack, isReady, isPlaying, playbackSource])

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
    youtubePlayer,
    spotifyPlayer,
    playbackSource,
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
        onPlayerReady={handleYouTubePlayerReady}
        onStateChange={handleYouTubeStateChange}
        onError={handleError}
        onDurationReady={handleYouTubeDurationReady}
        onTimeUpdate={handleYouTubeTimeUpdate}
      />
      <SpotifyPlayer
        onPlayerReady={handleSpotifyPlayerReady}
        onStateChange={handleSpotifyStateChange}
        onError={handleSpotifyError}
      />

      <div className="bg-black text-white p-3 md:p-4 border-border w-full">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
          {/* DESKTOP: Track Info */}
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

          {/* MOBILE: Track Info + Queue + Toggle */}
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
            <div className="flex items-center gap-2">
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleSwitch}
                      className={`h-10 w-10 ${!isSpotifyAuth && playbackSource === "youtube" ? "text-gray-400" : playbackSource === "youtube" ? "text-primary" : "hover:text-white"}`}
                      disabled={!currentTrack || (!isSpotifyAuth && playbackSource === "youtube")}
                      aria-label={playbackSource === "youtube" ? "Switch to Spotify" : "Switch to YouTube"}
                    >
                      {playbackSource === "youtube" ? <Music2 size={20} /> : <Youtube size={20} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{playbackSource === "youtube" ? "Switch to Spotify" : "Switch to YouTube"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* PLAYBACK CONTROLS */}
          <div className="flex flex-col items-center w-full md:flex-1 md:max-w-2xl">
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

          {/* DESKTOP: Queue, Toggle, Volume */}
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

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleSwitch}
                    className={`h-10 w-10 ${!isSpotifyAuth && playbackSource === "youtube" ? "text-gray-400" : playbackSource === "youtube" ? "text-primary" : "hover:text-white"}`}
                    disabled={!currentTrack || (!isSpotifyAuth && playbackSource === "youtube")}
                    aria-label={playbackSource === "youtube" ? "Switch to Spotify" : "Switch to YouTube"}
                  >
                    {playbackSource === "youtube" ? <Music2 size={20} /> : <Youtube size={20} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{playbackSource === "youtube" ? "Switch to Spotify" : "Switch to YouTube"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

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
