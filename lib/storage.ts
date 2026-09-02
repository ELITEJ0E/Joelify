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
  lyrics?: string
  createdAt?: string
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
  playbackSource?: "youtube" | "suno" | "local"
  audioSettings?: {
    crossfadeDuration: number
    gaplessPlayback: boolean
    eqPreset: string
    customEQ: number[]
    youtubeQuality: "audio" | "360p" | "720p" | "1080p"
    realAudioEngine?: boolean
  }
  lastModified?: number
}

const STORAGE_KEY = "joelify-app-state"
const OLD_STORAGE_KEY = "spotify-youtube-app-state"

/**
 * Robust, circular-reference-safe JSON stringifier that strips DOM Nodes,
 * HTMLAudioElements, React Fiber nodes, and circular structures.
 */
export function safeJsonStringify(value: any, space?: string | number): string {
  const seen = new WeakSet()

  try {
    return JSON.stringify(
      value,
      (key, val) => {
        if (typeof val === "function" || typeof val === "symbol") {
          return undefined
        }
        if (typeof val === "bigint") {
          return val.toString()
        }
        if (val && typeof val === "object") {
          // Detect DOM Nodes, HTML Elements, Audio Elements, Window, React Fiber nodes
          if (
            (typeof Node !== "undefined" && val instanceof Node) ||
            (typeof Element !== "undefined" && val instanceof Element) ||
            (typeof HTMLElement !== "undefined" && val instanceof HTMLElement) ||
            (typeof HTMLAudioElement !== "undefined" && val instanceof HTMLAudioElement) ||
            val.nodeType !== undefined ||
            val.tagName !== undefined ||
            (val.constructor && val.constructor.name && /HTML.*Element|Node|Window|FiberNode|SyntheticBaseEvent/.test(val.constructor.name))
          ) {
            return undefined
          }

          // Strip React internal references
          if (key && (key.startsWith("__reactFiber") || key.startsWith("__reactInternalInstance") || key === "stateNode")) {
            return undefined
          }

          if (seen.has(val)) {
            return undefined
          }
          seen.add(val)
        }
        return val
      },
      space
    )
  } catch (err) {
    console.warn("[Storage] safeJsonStringify fallback triggered:", err)
    return "{}"
  }
}

export function sanitizeTrack(track: any): Track | null {
  if (!track || typeof track !== "object") return null
  return {
    id: String(track.id || ""),
    title: String(track.title || "Unknown Title"),
    artist: String(track.artist || "Unknown Artist"),
    thumbnail: String(track.thumbnail || ""),
    duration: String(track.duration || "0:00"),
    ...(track.lyrics ? { lyrics: String(track.lyrics) } : {}),
    ...(track.createdAt ? { createdAt: String(track.createdAt) } : {}),
  }
}

export function sanitizePlaylist(playlist: any): Playlist | null {
  if (!playlist || typeof playlist !== "object") return null
  return {
    id: String(playlist.id || crypto.randomUUID()),
    name: String(playlist.name || "Untitled Playlist"),
    ...(playlist.description ? { description: String(playlist.description) } : {}),
    ...(playlist.coverImage ? { coverImage: String(playlist.coverImage) } : {}),
    tracks: Array.isArray(playlist.tracks)
      ? (playlist.tracks.map(sanitizeTrack).filter(Boolean) as Track[])
      : [],
    createdAt: typeof playlist.createdAt === "number" ? playlist.createdAt : Date.now(),
  }
}

export function sanitizeAppState(state: Partial<AppState>): Partial<AppState> {
  if (!state || typeof state !== "object") return {}
  return {
    currentTrack: state.currentTrack ? sanitizeTrack(state.currentTrack) : null,
    currentPlaylistId: state.currentPlaylistId ? String(state.currentPlaylistId) : null,
    playlists: Array.isArray(state.playlists)
      ? (state.playlists.map(sanitizePlaylist).filter(Boolean) as Playlist[])
      : [],
    likedSongs: Array.isArray(state.likedSongs)
      ? (state.likedSongs.map(sanitizeTrack).filter(Boolean) as Track[])
      : [],
    queue: Array.isArray(state.queue)
      ? (state.queue.map(sanitizeTrack).filter(Boolean) as Track[])
      : [],
    playbackPosition: typeof state.playbackPosition === "number" ? state.playbackPosition : 0,
    volume: typeof state.volume === "number" ? state.volume : 100,
    shuffle: Boolean(state.shuffle),
    repeat: state.repeat === "one" || state.repeat === "all" ? state.repeat : "off",
    theme: state.theme === "light" ? "light" : "dark",
    videoMode: Boolean(state.videoMode),
    customTheme: state.customTheme
      ? {
          primary: String(state.customTheme.primary || ""),
          accent: String(state.customTheme.accent || ""),
        }
      : undefined,
    playbackSource: state.playbackSource || "youtube",
    audioSettings: state.audioSettings
      ? {
          crossfadeDuration: Number(state.audioSettings.crossfadeDuration) || 0,
          gaplessPlayback: Boolean(state.audioSettings.gaplessPlayback),
          eqPreset: String(state.audioSettings.eqPreset || "Flat"),
          customEQ: Array.isArray(state.audioSettings.customEQ) ? state.audioSettings.customEQ.map(Number) : [0,0,0,0,0,0,0,0,0,0],
          youtubeQuality: state.audioSettings.youtubeQuality || "audio",
          realAudioEngine: Boolean(state.audioSettings.realAudioEngine),
        }
      : undefined,
    lastModified: typeof state.lastModified === "number" ? state.lastModified : Date.now(),
  }
}

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
    const cleanState = sanitizeAppState(state)
    localStorage.setItem(STORAGE_KEY, safeJsonStringify(cleanState))
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
