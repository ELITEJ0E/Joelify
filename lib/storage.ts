// localStorage utilities for state persistence
export interface Playlist {
  id: string
  name: string
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
  queue: Track[]
  playbackPosition: number
  volume: number
  shuffle: boolean
  repeat: "off" | "all" | "one"
  theme: "light" | "dark"
}

const STORAGE_KEY = "spotify-youtube-app-state"

export function loadState(): Partial<AppState> {
  if (typeof window === "undefined") return {}

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error("[v0] Failed to load state:", error)
    return {}
  }
}

export function saveState(state: Partial<AppState>): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error("[v0] Failed to save state:", error)
  }
}

export function createDefaultPlaylist(): Playlist {
  return {
    id: crypto.randomUUID(),
    name: "My Playlist",
    tracks: [],
    createdAt: Date.now(),
  }
}
