"use client"

import { useEffect, useRef, useState } from "react"
import { getValidAccessToken } from "@/lib/spotifyAuth"

declare global {
  interface Window {
    Spotify: any
    onSpotifyWebPlaybackSDKReady: () => void
  }
}

interface SpotifyPlayerProps {
  onPlayerReady: (player: any) => void
  onStateChange: (state: any) => void
  onError: (error: any) => void
}

export function SpotifyPlayer({ onPlayerReady, onStateChange, onError }: SpotifyPlayerProps) {
  const playerRef = useRef<any>(null)
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState<boolean | null>(null)
  const hasShownPremiumAlertRef = useRef(false)

  // Load Spotify Web Playback SDK
  useEffect(() => {
    if (window.Spotify) {
      setIsSDKLoaded(true)
      return
    }

    console.log("[Spotify] Loading Web Playback SDK")

    const script = document.createElement("script")
    script.src = "https://sdk.scdn.co/spotify-player.js"
    script.async = true
    document.body.appendChild(script)

    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log("[Spotify] SDK loaded successfully")
      setIsSDKLoaded(true)
    }

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  // Initialize player when SDK is loaded
  useEffect(() => {
    if (!isSDKLoaded || playerRef.current) return

    const initializePlayer = async () => {
      try {
        const token = await getValidAccessToken()

        // Check if user has premium before initializing player
        const profileResponse = await fetch("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (profileResponse.ok) {
          const profile = await profileResponse.json()
          const hasPremium = profile.product === "premium"
          setIsPremium(hasPremium)

          if (!hasPremium && !hasShownPremiumAlertRef.current) {
            hasShownPremiumAlertRef.current = true
            console.warn("[Spotify] Free account detected - Web Playback SDK requires Premium")
            onError({
              type: "premium_required",
              message: "Spotify Web Player requires a Premium subscription",
            })
            return
          }
        }

        console.log("[Spotify] Initializing player")

        const player = new window.Spotify.Player({
          name: "Joelify Music Player",
          getOAuthToken: async (cb: (token: string) => void) => {
            try {
              const accessToken = await getValidAccessToken()
              cb(accessToken)
            } catch (error) {
              console.error("[Spotify] Failed to get OAuth token:", error)
              onError({ message: "Failed to get OAuth token" })
            }
          },
          volume: 1.0,
        })

        // Player ready
        player.addListener("ready", ({ device_id }: { device_id: string }) => {
          console.log("[Spotify] Player ready with device ID:", device_id)
          setDeviceId(device_id)
          onPlayerReady(player)
        })

        // Player not ready
        player.addListener("not_ready", ({ device_id }: { device_id: string }) => {
          console.log("[Spotify] Player not ready, device ID:", device_id)
        })

        // Player state changed
        player.addListener("player_state_changed", (state: any) => {
          if (!state) {
            console.log("[Spotify] State updated: null")
            return
          }

          console.log("[Spotify] State updated:", {
            paused: state.paused,
            position: state.position,
            duration: state.duration,
            track: state.track_window?.current_track?.name,
          })

          onStateChange(state)
        })

        // Initialization error
        player.addListener("initialization_error", ({ message }: { message: string }) => {
          console.error("[Spotify] Initialization error:", message)
          onError({ type: "initialization_error", message })
        })

        // Authentication error
        player.addListener("authentication_error", ({ message }: { message: string }) => {
          console.error("[Spotify] Authentication error:", message)
          onError({ type: "authentication_error", message })
        })

        // Account error (catches premium restriction)
        player.addListener("account_error", ({ message }: { message: string }) => {
          console.error("[Spotify] Account error:", message)
          setIsPremium(false)

          if (!hasShownPremiumAlertRef.current) {
            hasShownPremiumAlertRef.current = true
            onError({ type: "account_error", message })
          }
        })

        // Playback error
        player.addListener("playback_error", ({ message }: { message: string }) => {
          console.error("[Spotify] Playback error:", message)
          onError({ type: "playback_error", message })
        })

        // Connect to the player
        const connected = await player.connect()
        if (connected) {
          console.log("[Spotify] Player connected successfully")
          playerRef.current = player
        } else {
          console.error("[Spotify] Failed to connect player")
          onError({ message: "Failed to connect player" })
        }
      } catch (error) {
        console.error("[Spotify] Player initialization failed:", error)
        onError({ message: "Player initialization failed" })
      }
    }

    initializePlayer()

    return () => {
      if (playerRef.current) {
        console.log("[Spotify] Disconnecting player")
        playerRef.current.disconnect()
        playerRef.current = null
      }
    }
  }, [isSDKLoaded, onPlayerReady, onStateChange, onError])

  // This component doesn't render anything visible
  return null
}

// Spotify Player Control Functions
export const SpotifyPlayerControls = {
  async play(player: any, uris?: string[]) {
    if (!player) return

    try {
      if (uris && uris.length > 0) {
        // Play specific tracks
        const token = await getValidAccessToken()
        const deviceId = await player._options.id

        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ uris }),
        })

        console.log("[Spotify] Playing tracks:", uris)
      } else {
        // Resume playback
        await player.resume()
        console.log("[Spotify] Resumed playback")
      }
    } catch (error) {
      console.error("[Spotify] Play error:", error)
    }
  },

  async pause(player: any) {
    if (!player) return

    try {
      await player.pause()
      console.log("[Spotify] Paused playback")
    } catch (error) {
      console.error("[Spotify] Pause error:", error)
    }
  },

  async nextTrack(player: any) {
    if (!player) return

    try {
      await player.nextTrack()
      console.log("[Spotify] Skipped to next track")
    } catch (error) {
      console.error("[Spotify] Next track error:", error)
    }
  },

  async previousTrack(player: any) {
    if (!player) return

    try {
      await player.previousTrack()
      console.log("[Spotify] Skipped to previous track")
    } catch (error) {
      console.error("[Spotify] Previous track error:", error)
    }
  },

  async seek(player: any, positionMs: number) {
    if (!player) return

    try {
      await player.seek(positionMs)
      console.log("[Spotify] Seeked to position:", positionMs)
    } catch (error) {
      console.error("[Spotify] Seek error:", error)
    }
  },

  async setVolume(player: any, volume: number) {
    if (!player) return

    try {
      // Volume should be between 0 and 1
      const normalizedVolume = Math.max(0, Math.min(1, volume / 100))
      await player.setVolume(normalizedVolume)
      console.log("[Spotify] Set volume to:", normalizedVolume)
    } catch (error) {
      console.error("[Spotify] Set volume error:", error)
    }
  },

  async getCurrentState(player: any) {
    if (!player) return null

    try {
      const state = await player.getCurrentState()
      return state
    } catch (error) {
      console.error("[Spotify] Get current state error:", error)
      return null
    }
  },

  async togglePlay(player: any) {
    if (!player) return

    try {
      await player.togglePlay()
      console.log("[Spotify] Toggled play/pause")
    } catch (error) {
      console.error("[Spotify] Toggle play error:", error)
    }
  },
}
