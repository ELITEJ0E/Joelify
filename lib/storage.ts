// lib/storage.ts - Enhanced version
export interface Playlist {
  id: string
  name: string
  description?: string
  coverImage?: string
  tracks: Track[]
  createdAt: number
}

export interface Track {
  id: string
  title: string
  artist: string
  thumbnail: string
  duration: string
}

export interface AppState {
  currentTrack: Track | null
  currentPlaylistId: string | null
  playlists: Playlist[]
  likedSongs: Track[]
  queue: Track[]
  playbackPosition: number
  volume: number
  shuffle: boolean
  repeat: "off" | "all" | "one"
  theme: "dark" | "light"
  videoMode: boolean
  customTheme?: {
    primary: string
    accent: string
  }
  playbackSource?: "youtube" | "suno"
  audioSettings?: {
    crossfadeDuration: number
    gaplessPlayback: boolean
    eqPreset: string
    customEQ: number[]
    youtubeQuality: "audio" | "360p" | "720p" | "1080p"
  }
}

const STORAGE_KEY = "joelify-app-state"
const OLD_STORAGE_KEY = "spotify-youtube-app-state"

export function loadState(): Partial<AppState> {
  if (typeof window === "undefined") return {}

  try {
    // 1. Try to get data from current key
    let stored = localStorage.getItem(STORAGE_KEY)
    
    // 2. Migration: If current key is empty, check old key
    if (!stored) {
      const oldStored = localStorage.getItem(OLD_STORAGE_KEY)
      if (oldStored) {
        console.log("[Storage] Migrating legacy data to new session key...")
        stored = oldStored
        // Save to new key immediately and clean up old key
        localStorage.setItem(STORAGE_KEY, oldStored)
        localStorage.removeItem(OLD_STORAGE_KEY)
      }
    }

    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error("[Storage] Failed to load state:", error)
    return {}
  }
}

export function saveState(state: Partial<AppState>): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error("[Storage] Failed to save state:", error)
  }
}

export function createDefaultPlaylist(): Playlist {
  return {
    id: crypto.randomUUID(),
    name: "My Playlist",
    description: "Your favorite songs",
    coverImage: undefined,
    tracks: [],
    createdAt: Date.now(),
  }
}
