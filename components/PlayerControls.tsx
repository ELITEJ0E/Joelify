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
  const nextTrackTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Clear any pending next track timeouts
  const clearNextTrackTimeout = useCallback(() => {
    if (nextTrackTimeoutRef.current) {
      clearTimeout(nextTrackTimeoutRef.current)
      nextTrackTimeoutRef.current = null
    }
  }, [])

  // **FIXED: Auto-play new tracks when they change**
  useEffect(() => {
    if (!currentTrack || !isReady) return

    console.log("[Player] ===== Track changed =====")
    console.log("[Player] New track:", currentTrack.title)
    console.log("[Player] Playback source:", playbackSource)
    console.log("[Player] Is ready:", isReady)
    
    // Clear any pending next track actions
    clearNextTrackTimeout()

    if (playbackSource === "spotify" && spotifyPlayer) {
      const playSpotifyTrack = async () => {
        try {
          let trackUri = currentTrack.id
          if (!trackUri.startsWith('spotify:track:')) {
            trackUri = `spotify:track:${trackUri}`
          }
          console.log("[Spotify] Auto-playing:", trackUri)
          await SpotifyPlayerControls.play(spotifyPlayer, [trackUri])
          setIsPlaying(true)
        } catch (error) {
          console.error("[Spotify] Failed to auto-play track:", error)
        }
      }
      setTimeout(playSpotifyTrack, 300)
    } else if (playbackSource === "youtube" && youtubePlayer) {
      // YouTube will auto-play when video changes via loadVideoById
      setTimeout(() => {
        console.log("[YouTube] Auto-playing video")
        if (youtubePlayer && typeof youtubePlayer.playVideo === 'function') {
          youtubePlayer.playVideo()
          setIsPlaying(true)
        }
      }, 500)
    }
  }, [currentTrack?.id, spotifyPlayer, youtubePlayer, playbackSource, isReady, clearNextTrackTimeout])

  const handleYouTubeDurationReady = useCallback((validDuration: number) => {
    console.log("[Player] Duration ready:", validDuration)
    setDuration(validDuration)
  }, [])

  const handleYouTubeTimeUpdate = useCallback(
    (currentTime: number, duration: number) => {
      if (!isSeekingRef.current && playbackSource === "youtube") {
        setCurrentTime(currentTime)
        setPlaybackPosition(currentTime)

        setDuration((prevDuration) => {
          if (Math.abs(prevDuration - duration) > 1) {
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
      console.log("[Spotify] Player ready")
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

      // **FIXED: Detect track end and auto-play next**
      if (state.paused && state.position === 0 && state.duration > 0 && !state.loading) {
        console.log("[Spotify] Track ended, playing next")
        clearNextTrackTimeout()
        nextTrackTimeoutRef.current = setTimeout(() => handleNext(), 100)
      }
    },
    [playbackSource, currentTrack, setCurrentTrack, setPlaybackPosition, clearNextTrackTimeout],
  )

  const handleSpotifyError = useCallback((error: any) => {
    console.error("[Spotify] Player error:", error)
  }, [])

  // **FIXED: Improved handleNext with proper queue and repeat logic**
  const handleNext = useCallback(() => {
    console.log("[Player] ===== handleNext called =====")
    console.log("[Player] Queue length:", queue.length)
    console.log("[Player] Repeat:", repeat)
    console.log("[Player] Shuffle:", shuffle)
    console.log("[Player] Current playlist ID:", currentPlaylistId)
    console.log("[Player] Current track:", currentTrack?.title)
    
    // **1. Handle Repeat One - HIGHEST PRIORITY**
    if (repeat === "one" && currentTrack) {
      console.log("[Player] ✅ Repeat ONE - replaying current track")
      setCurrentTime(0)
      setPlaybackPosition(0)
      
      // Force track to replay by re-setting it
      const trackToReplay = { ...currentTrack }
      
      if (playbackSource === "youtube" && youtubePlayer) {
        setTimeout(() => {
          youtubePlayer.seekTo(0, true)
          youtubePlayer.playVideo()
          setIsPlaying(true)
        }, 200)
      } else if (playbackSource === "spotify" && spotifyPlayer) {
        setTimeout(async () => {
          let trackUri = trackToReplay.id
          if (!trackUri.startsWith('spotify:track:')) {
            trackUri = `spotify:track:${trackUri}`
          }
          await SpotifyPlayerControls.play(spotifyPlayer, [trackUri])
          setIsPlaying(true)
        }, 200)
      }
      return
    }

    // **2. Play next track from queue - SECOND PRIORITY**
    if (queue.length > 0) {
      console.log("[Player] ✅ Playing next from QUEUE:", queue[0].title)
      const nextTrack = queue[0]
      const newQueue = queue.slice(1)
      
      // Update track history
      if (currentTrack) {
        playedTracksRef.current.add(currentTrack.id)
        playHistoryRef.current.push(currentTrack.id)
      }
      
      setCurrentTrack(nextTrack)
      setQueue(newQueue)
      setCurrentTime(0)
      setPlaybackPosition(0)
      console.log("[Player] New queue length:", newQueue.length)
      return
    }

    // **3. Handle Repeat All - THIRD PRIORITY**
    if (repeat === "all") {
      console.log("[Player] ✅ Repeat ALL mode active")
      
      // Get current playlist or use all available tracks
      let availableTracks: Track[] = []
      
      if (currentPlaylistId) {
        const currentPlaylist = playlists.find((p) => p.id === currentPlaylistId)
        if (currentPlaylist) {
          availableTracks = currentPlaylist.tracks
          console.log("[Player] Using playlist tracks:", availableTracks.length)
        }
      }
      
      // If no playlist, we can't repeat all
      if (availableTracks.length === 0) {
        console.log("[Player] ❌ No tracks available for repeat all")
        setIsPlaying(false)
        return
      }

      let nextTrack: Track | null = null

      if (shuffle) {
        console.log("[Player] Shuffle mode - selecting random track")
        // Shuffle mode: avoid recently played tracks
        const recentlyPlayed = playHistoryRef.current.slice(-Math.min(3, availableTracks.length - 1))
        const notRecentlyPlayed = availableTracks.filter((t) => !recentlyPlayed.includes(t.id))

        if (notRecentlyPlayed.length === 0) {
          // Reset history and pick random
          console.log("[Player] Resetting shuffle history")
          playHistoryRef.current = []
          playedTracksRef.current.clear()
          nextTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)]
        } else {
          nextTrack = notRecentlyPlayed[Math.floor(Math.random() * notRecentlyPlayed.length)]
        }
      } else {
        console.log("[Player] Sequential mode - playing next in order")
        // Sequential mode: play next track
        const currentIndex = availableTracks.findIndex((t) => t.id === currentTrack?.id)
        console.log("[Player] Current index:", currentIndex)
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % availableTracks.length : 0
        console.log("[Player] Next index:", nextIndex)
        nextTrack = availableTracks[nextIndex]
      }

      if (nextTrack) {
        console.log("[Player] ✅ Playing next track:", nextTrack.title)
        if (currentTrack) {
          playedTracksRef.current.add(currentTrack.id)
          playHistoryRef.current.push(currentTrack.id)
        }
        setCurrentTrack(nextTrack)
        setCurrentTime(0)
        setPlaybackPosition(0)
        return
      }
    }

    // **4. Handle shuffle without repeat all**
    if (shuffle && currentPlaylistId) {
      console.log("[Player] ✅ Shuffle mode (no repeat)")
      const currentPlaylist = playlists.find((p) => p.id === currentPlaylistId)
      if (currentPlaylist && currentPlaylist.tracks.length > 0) {
        const recentlyPlayed = playHistoryRef.current.slice(-Math.min(3, currentPlaylist.tracks.length - 1))
        const availableTracks = currentPlaylist.tracks.filter((t) => !recentlyPlayed.includes(t.id))
        
        if (availableTracks.length > 0) {
          const nextTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)]
          console.log("[Player] ✅ Playing shuffled track:", nextTrack.title)
          
          if (currentTrack) {
            playedTracksRef.current.add(currentTrack.id)
            playHistoryRef.current.push(currentTrack.id)
          }
          
          setCurrentTrack(nextTrack)
          setCurrentTime(0)
          setPlaybackPosition(0)
          return
        }
      }
    }

    // **5. Sequential play (no repeat, no shuffle)**
    if (currentPlaylistId && !shuffle && repeat === "off") {
      console.log("[Player] Sequential mode (no repeat)")
      const currentPlaylist = playlists.find((p) => p.id === currentPlaylistId)
      if (currentPlaylist && currentPlaylist.tracks.length > 0) {
        const currentIndex = currentPlaylist.tracks.findIndex((t) => t.id === currentTrack?.id)
        if (currentIndex >= 0 && currentIndex < currentPlaylist.tracks.length - 1) {
          const nextTrack = currentPlaylist.tracks[currentIndex + 1]
          console.log("[Player] ✅ Playing next sequential track:", nextTrack.title)
          
          if (currentTrack) {
            playedTracksRef.current.add(currentTrack.id)
            playHistoryRef.current.push(currentTrack.id)
          }
          
          setCurrentTrack(nextTrack)
          setCurrentTime(0)
          setPlaybackPosition(0)
          return
        }
      }
    }

    // **6. No more tracks - stop playback**
    console.log("[Player] ❌ No more tracks to play - stopping")
    setIsPlaying(false)
    setCurrentTime(0)
    setPlaybackPosition(0)
    
    if (playbackSource === "youtube" && youtubePlayer) {
      youtubePlayer.pauseVideo()
      youtubePlayer.seekTo(0)
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
      console.log("[Player] YouTube player ready")
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
        youtubePlayer.seekTo(newTime, true)
      } else if (playbackSource === "spotify" && spotifyPlayer) {
        SpotifyPlayerControls.seek(spotifyPlayer, newTime * 1000)
      }

      setCurrentTime(newTime)
      setPlaybackPosition(newTime)

      setTimeout(() => {
        isSeekingRef.current = false
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
      console.log("[Player] Track changed:", currentTrack.title)
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
    
    if (playbackSource === "youtube" && youtubePlayer) {
      youtubePlayer.pauseVideo()
    } else if (playbackSource === "spotify" && spotifyPlayer) {
      SpotifyPlayerControls.pause(spotifyPlayer)
    }
    
    setIsPlaying(false)
    setPlaybackSource(playbackSource === "youtube" ? "spotify" : "youtube")
  }

  // **FIXED: YouTube state change handler with better track end detection**
  const handleYouTubeStateChange = useCallback(
    (event: any) => {
      if (playbackSource !== "youtube") return

      const playerState = event.data
      console.log("[Player] YouTube state changed:", playerState)

      lastPlayerStateRef.current = playerState

      switch (playerState) {
        case 1: // Playing
          setIsPlaying(true)
          break
        case 2: // Paused
          setIsPlaying(false)
          if (youtubePlayer && typeof youtubePlayer.getCurrentTime === "function") {
            const time = youtubePlayer.getCurrentTime()
            setCurrentTime(time)
            setPlaybackPosition(time)
          }
          break
        case 0: // Ended
          console.log("[Player] YouTube video ended")
          setIsPlaying(false)
          setCurrentTime(0)
          setPlaybackPosition(0)
          // **FIXED: Call handleNext to play next track**
          clearNextTrackTimeout()
          nextTrackTimeoutRef.current = setTimeout(() => handleNext(), 100)
          break
        case -1: // Unstarted
          setIsPlaying(false)
          break
      }
    },
    [youtubePlayer, setPlaybackPosition, playbackSource, handleNext, clearNextTrackTimeout],
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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      clearNextTrackTimeout()
    }
  }, [clearNextTrackTimeout])

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
