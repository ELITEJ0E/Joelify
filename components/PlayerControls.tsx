"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Volume2,
  VolumeX,
  List,
  Music,
  Video,
  Youtube,
  Music2,
  Type,
  Minimize2,
  Maximize2,
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
import { MusicVisualizer } from "./AudioAnalyzerVisualizer.tsx" // Import MusicVisualizer

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
    audioSettings,
    setAudioSettings,
  } = useApp()

  const [youtubePlayer, setYoutubePlayer] = useState<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [isSpotifyAuth, setIsSpotifyAuth] = useState(false)
  const [spotifyState, setSpotifyState] = useState<any>(null)
  const [shouldAutoPlaySpotify, setShouldAutoPlaySpotify] = useState(false)
  const [isMiniPlayer, setIsMiniPlayer] = useState(false)
  const [isExpandedPlayer, setIsExpandedPlayer] = useState(false)
  const [isPiPSupported, setIsPiPSupported] = useState(false)
  const [hasShownSpotifyAlert, setHasShownSpotifyAlert] = useState(false)

  const trackEndHandledRef = useRef(false)
  const isSeekingRef = useRef(false)
  const hasRestoredPositionRef = useRef(false)
  const lastPlayerStateRef = useRef<number>(-1)
  const playedTracksRef = useRef(new Set<string>())
  const playHistoryRef = useRef<string[]>([])
  const videoElementRef = useRef<HTMLVideoElement | null>(null)

  const getNextShuffleTrack = useCallback((currentPlaylist: any) => {
    if (!currentPlaylist || currentPlaylist.tracks.length === 0) return null

    // If all tracks have been played, reset history
    if (playedTracksRef.current.size >= currentPlaylist.tracks.length) {
      console.log("[Shuffle] All tracks played, resetting history")
      playedTracksRef.current.clear()
      playHistoryRef.current = []
    }

    // Get unplayed tracks
    const unplayedTracks = currentPlaylist.tracks.filter((t: any) => !playedTracksRef.current.has(t.id))

    // If all tracks are played (shouldn't happen after reset), use all tracks
    const availableTracks = unplayedTracks.length > 0 ? unplayedTracks : currentPlaylist.tracks

    // Pick random track
    const randomIndex = Math.floor(Math.random() * availableTracks.length)
    return availableTracks[randomIndex]
  }, [])

  const handleRepeatOne = useCallback(() => {
    if (!currentTrack) return

    console.log("[v0] Repeat one - restarting track")
    // Keep trackEndHandledRef true to prevent re-triggering during seek
    trackEndHandledRef.current = true

    if (playbackSource === "youtube" && youtubePlayer) {
      youtubePlayer.seekTo(0, true)
      youtubePlayer.playVideo()
      setIsPlaying(true)
      // Reset flag after a delay to allow YouTube to transition through states
      setTimeout(() => {
        trackEndHandledRef.current = false
        console.log("[v0] Repeat one - flag reset, ready for next end")
      }, 1500)
    } else if (playbackSource === "spotify" && spotifyPlayer) {
      SpotifyPlayerControls.seek(spotifyPlayer, 0)
      SpotifyPlayerControls.play(spotifyPlayer)
      setIsPlaying(true)
      setShouldAutoPlaySpotify(true)
      setTimeout(() => {
        trackEndHandledRef.current = false
      }, 1500)
    }

    setCurrentTime(0)
    setPlaybackPosition(0)
  }, [currentTrack, youtubePlayer, spotifyPlayer, playbackSource, setPlaybackPosition])

  const handleNext = useCallback(() => {
    console.log("[Player] handleNext called", {
      repeat,
      queueLength: queue.length,
      currentTrack: currentTrack?.title,
      shuffle,
      currentPlaylistId,
    })

    if (repeat === "one" && currentTrack) {
      handleRepeatOne()
      return
    }

    trackEndHandledRef.current = false

    if (currentTrack) {
      playedTracksRef.current.add(currentTrack.id)
      playHistoryRef.current.push(currentTrack.id)
      console.log("[Player] Added to history:", currentTrack.title, "Total played:", playHistoryRef.current.length)
    }

    if (queue.length > 0) {
      console.log("[v0] Playing next from queue")
      const nextTrack = queue[0]
      setCurrentTrack(nextTrack)
      setQueue(queue.slice(1))
      setCurrentTime(0)
      setPlaybackPosition(0)

      if (playbackSource === "youtube") {
        // YouTube auto-play is handled by the YouTubePlayer component
        // which loads the new video via useEffect on currentTrack.id change
        // and triggers onStateChange(1) when it starts playing
        // We just need to ensure isPlaying is set
        setIsPlaying(true)
        console.log("[v0] Queue track set, YouTube will auto-load and play")
      } else if (playbackSource === "spotify") {
        setShouldAutoPlaySpotify(true)
        console.log("[v0] Auto-playing queue track (Spotify)")
      }
      return
    }

    if (currentPlaylistId) {
      const currentPlaylist = playlists.find((p) => p.id === currentPlaylistId)

      if (currentPlaylist && currentPlaylist.tracks.length > 0) {
        console.log("[Player] Finding next track, shuffle:", shuffle, "repeat:", repeat)
        let nextTrack: typeof currentTrack = null

        if (shuffle) {
          nextTrack = getNextShuffleTrack(currentPlaylist)
          console.log("[Player] Shuffle: selected track:", nextTrack?.title)

          if (!nextTrack && repeat === "all") {
            console.log("[Player] Shuffle exhausted with repeat all - resetting")
            playHistoryRef.current = []
            playedTracksRef.current.clear()
            nextTrack = getNextShuffleTrack(currentPlaylist)
          }
        } else {
          // Sequential mode
          const currentIndex = currentPlaylist.tracks.findIndex((t: any) => t.id === currentTrack?.id)
          console.log(
            "[Player] Sequential: current index:",
            currentIndex,
            "total tracks:",
            currentPlaylist.tracks.length,
          )

          if (currentIndex + 1 < currentPlaylist.tracks.length) {
            // There's a next track
            nextTrack = currentPlaylist.tracks[currentIndex + 1]
            console.log("[Player] Playing next track at index:", currentIndex + 1)
          } else if (repeat === "all") {
            nextTrack = currentPlaylist.tracks[0]
            console.log("[Player] Repeat All: looping back to first track")
            playHistoryRef.current = []
            playedTracksRef.current.clear()
          } else {
            // No next track and no repeat - stop playback
            console.log("[Player] End of playlist, no repeat - stopping")
          }
        }

        if (nextTrack) {
          console.log("[v0] Playing next track:", nextTrack.title)
          setCurrentTrack(nextTrack)
          setCurrentTime(0)
          setPlaybackPosition(0)

          if (playbackSource === "youtube") {
            // YouTube auto-loads and auto-plays via loadVideoById in YouTubePlayer
            setIsPlaying(true)
            console.log("[v0] Playlist track set, YouTube will auto-load and play")
          } else if (playbackSource === "spotify") {
            setShouldAutoPlaySpotify(true)
            console.log("[v0] Auto-playing next track (Spotify)")
          }
          return
        }
      }
    }

    console.log("[Player] No next track - stopping playback")
    setIsPlaying(false)
    setCurrentTime(0)
    setPlaybackPosition(0)
  }, [
    youtubePlayer,
    spotifyPlayer,
    playbackSource,
    queue,
    setQueue,
    currentTrack,
    setCurrentTrack,
    repeat,
    shuffle,
    currentPlaylistId,
    playlists,
    setPlaybackPosition,
    getNextShuffleTrack,
    handleRepeatOne,
  ])

  // Check PiP support on mount
  useEffect(() => {
    setIsPiPSupported("pictureInPictureEnabled" in document)
  }, [])

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
          const previousTrack = currentPlaylist?.tracks.find((t: any) => t.id === previousTrackId)

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
      setCurrentTime(0)
      setPlaybackPosition(0)
      setDuration(0)
      hasRestoredPositionRef.current = false
      setIsPlaying(false)
      trackEndHandledRef.current = false
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

  useEffect(() => {
    if (playbackSource !== "spotify") return

    // Removed premium check functionality
  }, [playbackSource, setPlaybackSource])

  const handleSwitch = () => {
    if (playbackSource === "youtube" && !isSpotifyAuth) {
      alert("Please login to Spotify first")
      return
    }

    // Removed premium alert logic
    if (playbackSource === "spotify") {
      localStorage.removeItem("spotify_premium_alert_shown")
    }

    if (playbackSource === "youtube" && youtubePlayer) {
      youtubePlayer.pauseVideo()
    } else if (playbackSource === "spotify" && spotifyPlayer) {
      SpotifyPlayerControls.pause(spotifyPlayer)
    }

    setIsPlaying(false)
    setShouldAutoPlaySpotify(false)
    setPlaybackSource(playbackSource === "youtube" ? "spotify" : "youtube")
  }

  const handleYouTubeStateChange = useCallback(
    (event: any) => {
      if (playbackSource !== "youtube") return

      const playerState = event.data
      lastPlayerStateRef.current = playerState

      switch (playerState) {
        case 1: // Playing
          setIsPlaying(true)
          // Only reset end flag if NOT in repeat-one mode
          // In repeat-one, handleRepeatOne manages the flag with its own timeout
          if (trackEndHandledRef.current && repeat !== "one") {
            console.log("[v0] Track started playing, resetting end flag")
            trackEndHandledRef.current = false
          }
          if (youtubePlayer && audioSettings.youtubeQuality !== "audio") {
            youtubePlayer.setPlaybackQuality(audioSettings.youtubeQuality)
          }
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
          if (!trackEndHandledRef.current) {
            console.log("[v0] Track ended, repeat mode:", repeat)
            trackEndHandledRef.current = true
            if (repeat === "one") {
              handleRepeatOne()
            } else {
              handleNext()
            }
          } else {
            console.log("[v0] Track ended but already handled, ignoring")
          }
          break
        case -1: // Unstarted
          setIsPlaying(false)
          break
      }
    },
    [youtubePlayer, setPlaybackPosition, playbackSource, handleNext, audioSettings, repeat, handleRepeatOne],
  )

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

  const saveToListeningHistory = useCallback(
    (track: typeof currentTrack) => {
      if (!track) return

      const history = JSON.parse(localStorage.getItem("listening_history") || "[]")
      const entry = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail,
        duration: duration || 0,
        playedAt: new Date().toISOString(),
        source: playbackSource,
      }

      history.push(entry)
      // Keep only last 1000 plays
      if (history.length > 1000) {
        history.shift()
      }

      localStorage.setItem("listening_history", JSON.stringify(history))
    },
    [duration, playbackSource],
  )

  useEffect(() => {
    if (currentTrack && isPlaying && currentTime > 5) {
      // Save after 5 seconds of playback
      saveToListeningHistory(currentTrack)
    }
  }, [currentTrack, isPlaying, currentTime, saveToListeningHistory])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault()
          handlePlayPause()
          break
        case "arrowright":
          e.preventDefault()
          handleSeekForward()
          break
        case "arrowleft":
          e.preventDefault()
          handleSeekBackward()
          break
        case "arrowup":
          e.preventDefault()
          handleVolumeChange([Math.min(100, volume + 5)])
          break
        case "arrowdown":
          e.preventDefault()
          handleVolumeChange([Math.max(0, volume - 5)])
          break
        case "m":
          e.preventDefault()
          toggleMute()
          break
        case "n":
          e.preventDefault()
          handleNext()
          break
        case "p":
          e.preventDefault()
          handlePrevious()
          break
        case "s":
          e.preventDefault()
          toggleShuffle()
          break
        case "r":
          e.preventDefault()
          toggleRepeat()
          break
        case "v":
          e.preventDefault()
          toggleVideoMode()
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [
    handlePlayPause,
    handleSeekForward,
    handleSeekBackward,
    handleNext,
    handlePrevious,
    volume,
    handleVolumeChange,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    toggleVideoMode,
  ])

  const handleSleepTimerEnd = useCallback(() => {
    if (playbackSource === "youtube" && youtubePlayer) {
      youtubePlayer.pauseVideo()
    } else if (playbackSource === "spotify" && spotifyPlayer) {
      SpotifyPlayerControls.pause(spotifyPlayer)
    }
    setIsPlaying(false)
  }, [youtubePlayer, spotifyPlayer, playbackSource])

  const togglePiP = async () => {
    if (!videoElementRef.current || !isPiPSupported) return

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else {
        await videoElementRef.current.requestPictureInPicture()
      }
    } catch (error) {
      console.error("[PiP] Failed to toggle:", error)
    }
  }

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
      if (playbackSource !== "spotify" || !state) return

      setCurrentTime(state.position / 1000)
      setPlaybackPosition(state.position / 1000)
      setIsPlaying(!state.paused)

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

      // Better track end detection for Spotify
      const trackEnded = state.position >= state.duration - 1000 && state.duration > 0 // Within last second
      const justEnded = !state.paused && trackEnded && !trackEndHandledRef.current

      if (justEnded || (state.paused && state.position === 0 && state.duration > 0 && !trackEndHandledRef.current)) {
        console.log("[Spotify] Track ended, moving to next")
        trackEndHandledRef.current = true
        if (repeat === "one") {
          handleRepeatOne()
        } else {
          handleNext()
        }
      }

      if (!state.paused && trackEndHandledRef.current) {
        trackEndHandledRef.current = false
      }
    },
    [playbackSource, currentTrack, setCurrentTrack, setPlaybackPosition, handleNext, repeat, handleRepeatOne],
  )

  const handleSpotifyError = useCallback((error: any) => {
    console.error("[Spotify] Player error:", error)
    // Removed premium required alert
  }, [])

  const handleYouTubeDurationReady = useCallback((validDuration: number) => {
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

  useEffect(() => {
    if (!currentTrack || !spotifyPlayer || playbackSource !== "spotify" || !isReady || !shouldAutoPlaySpotify) return

    const playSpotifyTrack = async () => {
      try {
        // Add a check for player state
        const state = spotifyPlayer._state
        if (state && !state.paused) {
          // Player is already playing something
          return
        }

        let trackUri = currentTrack.id
        if (!trackUri.startsWith("spotify:track:")) {
          trackUri = `spotify:track:${trackUri}`
        }

        await SpotifyPlayerControls.play(spotifyPlayer, [trackUri])
        setIsPlaying(true)
        setShouldAutoPlaySpotify(false)
        trackEndHandledRef.current = false // Reset end flag
      } catch (error) {
        console.error("[Spotify] Failed to auto-play track:", error)
        // Retry once after delay
        setTimeout(() => {
          if (shouldAutoPlaySpotify) {
            playSpotifyTrack()
          }
        }, 1000)
      }
    }

    const timer = setTimeout(() => {
      playSpotifyTrack()
    }, 500) // Increased delay for better reliability

    return () => clearTimeout(timer)
  }, [currentTrack, spotifyPlayer, playbackSource, isReady, shouldAutoPlaySpotify])

  if (isMiniPlayer) {
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

      {/* Expandable Player with Visualizer */}
      <ExpandablePlayer
        isExpanded={isExpandedPlayer}
        onExpandChange={setIsExpandedPlayer}
        currentTime={currentTime}
        isPlaying={isPlaying}
        volume={volume}
      >
        {/* Player controls in expanded view */}
        <div className="flex flex-col items-center w-full gap-5">
          <div className="flex items-center gap-3 w-full">
            <span className="text-xs text-white/50 w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
            <div className="flex-1">
              <Slider
                value={[currentTime]}
                max={duration > 0 ? duration : 1}
                step={0.1}
                onValueChange={handleSeek}
                disabled={!currentTrack || duration === 0 || !isReady}
                className="cursor-pointer"
              />
            </div>
            <span className="text-xs text-white/50 w-10 tabular-nums">{formatTime(duration)}</span>
          </div>

          <TooltipProvider>
            <div className="flex items-center justify-center gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={toggleShuffle}
                    className={`h-11 w-11 transition-all duration-150 ${shuffle ? "text-primary" : "text-white/50 hover:text-white"}`}
                    disabled={!currentTrack}>
                    <Shuffle size={21} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{shuffle ? "Shuffle On" : "Shuffle Off"}</p></TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={handlePrevious}
                    className="h-11 w-11 text-white/70 hover:text-white transition-all duration-150"
                    disabled={!currentTrack}>
                    <SkipBack size={25} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Previous</p></TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" onClick={handlePlayPause} disabled={!currentTrack || !isReady}
                    className="h-16 w-16 rounded-full bg-white text-black hover:bg-white/90 hover:scale-105 active:scale-95 transition-all duration-150 shadow-glow disabled:opacity-40">
                    {isPlaying ? <Pause fill="currentColor" size={28} /> : <Play fill="currentColor" size={28} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{isPlaying ? "Pause" : "Play"}</p></TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={handleNext}
                    className="h-11 w-11 text-white/70 hover:text-white transition-all duration-150"
                    disabled={!currentTrack}>
                    <SkipForward size={25} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Next</p></TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={toggleRepeat}
                    className={`h-11 w-11 relative transition-all duration-150 ${repeat !== "off" ? "text-primary" : "text-white/50 hover:text-white"}`}
                    disabled={!currentTrack}>
                    <Repeat size={21} />
                    {repeat === "one" && <span className="absolute text-[10px] font-bold leading-none">1</span>}
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{getRepeatLabel()}</p></TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </ExpandablePlayer>

      {/* Collapsed Player */}
      <div className="bg-[hsl(var(--surface-1))] border-t border-border/50 text-foreground px-3 py-2 md:px-5 md:py-3 w-full shadow-[0_-2px_20px_-4px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">

          {/* DESKTOP: Track Info */}
          <div
            className="hidden md:flex items-center gap-3 flex-1 min-w-0 cursor-pointer group rounded-xl px-2 py-1.5 hover:bg-white/5 transition-colors duration-200"
            onClick={() => setIsExpandedPlayer(true)}
          >
            {currentTrack ? (
              <>
                {currentTrack.thumbnail ? (
                  <Image
                    src={currentTrack.thumbnail || "/placeholder.svg"}
                    width={52}
                    height={52}
                    alt={currentTrack.title || "Track thumbnail"}
                    className="w-13 h-13 rounded-lg object-cover flex-shrink-0 shadow-card"
                  />
                ) : (
                  <div className="w-13 h-13 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xl text-muted-foreground">♪</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors duration-150">{currentTrack.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{currentTrack.artist}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-13 h-13 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xl text-muted-foreground">♪</span>
                </div>
                <div>
                  <p className="font-medium text-sm text-muted-foreground">No track playing</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">Search for music to get started</p>
                </div>
              </>
            )}
          </div>

          {/* MOBILE: Track Info + Queue + Toggle + Expand */}
          <div className="md:hidden w-full flex items-center justify-between mb-2">
            <div
              className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
              onClick={() => setIsExpandedPlayer(true)}
            >
              {currentTrack ? (
                <>
                  {currentTrack.thumbnail ? (
                    <Image
                      src={currentTrack.thumbnail || "/placeholder.svg"}
                      width={44}
                      height={44}
                      alt={currentTrack.title || "Track thumbnail"}
                      className="w-11 h-11 rounded-lg object-cover flex-shrink-0 shadow-card"
                    />
                  ) : (
                    <div className="w-11 h-11 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-lg text-muted-foreground">♪</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm line-clamp-1">{currentTrack.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{currentTrack.artist}</p>
                  </div>
                </>
              ) : (
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">No track playing</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Sheet>
                <SheetTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-foreground" aria-label="Show lyrics" disabled={!currentTrack}>
                    <Type size={18} />
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:w-96 border-border/50">
                  <SheetHeader><SheetTitle>Lyrics</SheetTitle></SheetHeader>
                  <div className="mt-6 h-[calc(100vh-8rem)]">
                    <LyricsDisplay currentTime={currentTime} isPlaying={isPlaying} />
                  </div>
                </SheetContent>
              </Sheet>
              <Sheet>
                <SheetTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-foreground relative" aria-label="Open queue">
                    <List size={18} />
                    {queue.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-medium tabular-nums">
                        {queue.length}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:w-96 border-border/50">
                  <SheetHeader><SheetTitle>Queue</SheetTitle></SheetHeader>
                  <div className="mt-6 h-[calc(100vh-8rem)]"><QueueSheet /></div>
                </SheetContent>
              </Sheet>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon" variant="ghost"
                      onClick={handleSwitch}
                      className={`h-9 w-9 ${!isSpotifyAuth && playbackSource === "youtube" ? "text-muted-foreground/40" : playbackSource === "youtube" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                      disabled={!currentTrack || (!isSpotifyAuth && playbackSource === "youtube")}
                      aria-label={playbackSource === "youtube" ? "Switch to Spotify" : "Switch to YouTube"}
                    >
                      {playbackSource === "youtube" ? <Music2 size={18} /> : <Youtube size={18} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{playbackSource === "youtube" ? "Switch to Spotify" : "Switch to YouTube"}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button size="icon" variant="ghost" onClick={() => setIsExpandedPlayer(true)} className="h-9 w-9 text-muted-foreground hover:text-foreground" disabled={!currentTrack}>
                <Maximize2 size={18} />
              </Button>
            </div>
          </div>

          {/* PLAYBACK CONTROLS */}
          <div className="flex flex-col items-center w-full md:flex-1 md:max-w-xl">
            {/* Seek bar */}
            <div className="flex items-center gap-2 w-full mb-2">
              <span className="text-[11px] text-muted-foreground/70 w-9 text-right tabular-nums">{formatTime(currentTime)}</span>
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
              <span className="text-[11px] text-muted-foreground/70 w-9 tabular-nums">{formatTime(duration)}</span>
            </div>

            {/* Control buttons */}
            <TooltipProvider>
              <div className="flex items-center justify-center w-full gap-1 md:gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" onClick={toggleShuffle}
                      className={`h-9 w-9 transition-all duration-150 ${shuffle ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                      disabled={!currentTrack} aria-label="Toggle shuffle">
                      <Shuffle size={17} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{shuffle ? "Shuffle On" : "Shuffle Off"}</p></TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" onClick={handlePrevious}
                      className="h-9 w-9 text-muted-foreground hover:text-foreground"
                      disabled={!currentTrack} aria-label="Previous track">
                      <SkipBack size={20} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Previous</p></TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      onClick={handlePlayPause}
                      disabled={!currentTrack || !isReady}
                      aria-label={isPlaying ? "Pause" : "Play"}
                      className="h-11 w-11 rounded-full bg-foreground text-background hover:bg-foreground/90 hover:scale-105 active:scale-95 transition-all duration-150 shadow-md disabled:opacity-40"
                    >
                      {isPlaying ? <Pause fill="currentColor" size={20} /> : <Play fill="currentColor" size={20} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{isPlaying ? "Pause" : "Play"}</p></TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" onClick={handleNext}
                      className="h-9 w-9 text-muted-foreground hover:text-foreground"
                      disabled={!currentTrack} aria-label="Next track">
                      <SkipForward size={20} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Next</p></TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" onClick={toggleRepeat}
                      className={`h-9 w-9 relative transition-all duration-150 ${repeat !== "off" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                      disabled={!currentTrack} aria-label={`Repeat: ${repeat}`}>
                      <Repeat size={17} />
                      {repeat === "one" && <span className="absolute text-[9px] font-bold leading-none">1</span>}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{getRepeatLabel()}</p></TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" onClick={toggleVideoMode}
                      className={`h-9 w-9 transition-all duration-150 ${videoMode ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                      disabled={!currentTrack} aria-label={videoMode ? "Music mode" : "Video mode"}>
                      {videoMode ? <Video size={17} /> : <Music size={17} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{videoMode ? "Hide Video" : "Show Video"}</p></TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>

          {/* DESKTOP: Queue, Toggle, Mini Player, Sleep Timer, Volume */}
          <div className="hidden md:flex items-center gap-1 flex-1 justify-end">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-foreground relative" aria-label="Open queue">
                  <List size={18} />
                  {queue.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-medium tabular-nums">
                      {queue.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-96 border-border/50">
                <SheetHeader><SheetTitle>Queue</SheetTitle></SheetHeader>
                <div className="mt-6 h-[calc(100vh-8rem)]"><QueueSheet /></div>
              </SheetContent>
            </Sheet>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={handleSwitch}
                    className={`h-9 w-9 transition-all duration-150 ${!isSpotifyAuth && playbackSource === "youtube" ? "text-muted-foreground/40" : playbackSource === "youtube" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    disabled={!currentTrack || (!isSpotifyAuth && playbackSource === "youtube")}
                    aria-label={playbackSource === "youtube" ? "Switch to Spotify" : "Switch to YouTube"}>
                    {playbackSource === "youtube" ? <Music2 size={18} /> : <Youtube size={18} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{playbackSource === "youtube" ? "Switch to Spotify" : "Switch to YouTube"}</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={() => setIsMiniPlayer(true)}
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                    disabled={!currentTrack} aria-label="Mini player">
                    <Minimize2 size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Mini Player</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <SleepTimer onTimerEnd={handleSleepTimerEnd} isPlaying={isPlaying} />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={toggleMute}
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                    aria-label={isMuted ? "Unmute" : "Mute"}>
                    {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{isMuted ? "Unmute" : "Mute"}</p></TooltipContent>
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
