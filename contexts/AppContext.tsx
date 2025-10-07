"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { type AppState, type Playlist, type Track, loadState, saveState, createDefaultPlaylist } from "@/lib/storage"

interface RecentlyPlayed {
  type: "track" | "playlist"
  id: string
  timestamp: number
}

interface AppContextType extends AppState {
  setCurrentTrack: (track: Track | null) => void
  setCurrentPlaylistId: (id: string | null) => void
  setPlaylists: (playlists: Playlist[]) => void
  addPlaylist: (name: string, description?: string, coverImage?: string) => void
  deletePlaylist: (id: string) => void
  renamePlaylist: (id: string, name: string) => void
  updatePlaylistDescription: (id: string, description: string) => void
  updatePlaylistCover: (id: string, coverImage: string) => void
  addTrackToPlaylist: (playlistId: string, track: Track) => void
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void
  reorderPlaylistTracks: (playlistId: string, tracks: Track[]) => void
  setQueue: (track: Track[]) => void
  addToQueue: (track: Track) => void
  removeFromQueue: (index: number) => void
  setPlaybackPosition: (position: number) => void
  setVolume: (volume: number) => void
  toggleShuffle: () => void
  toggleRepeat: () => void
  setTheme: (theme: "light" | "dark") => void
  toggleVideoMode: () => void
  toggleLikedSong: (track: Track) => void
  isTrackLiked: (trackId: string) => boolean
  setLikedSongs: (songs: Track[]) => void
  recentlyPlayed: RecentlyPlayed[]
  addRecentlyPlayed: (item: { type: "track" | "playlist"; id: string }) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [likedSongs, setLikedSongs] = useState<Track[]>([])
  const [queue, setQueue] = useState<Track[]>([])
  const [playbackPosition, setPlaybackPosition] = useState(0)
  const [volume, setVolume] = useState(100)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("off")
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const [videoMode, setVideoMode] = useState(false)
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentlyPlayed[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Load state from localStorage on mount
  useEffect(() => {
    const stored = loadState()
    if (stored.currentTrack) setCurrentTrack(stored.currentTrack)
    if (stored.currentPlaylistId) setCurrentPlaylistId(stored.currentPlaylistId)
    if (stored.playlists && stored.playlists.length > 0) {
      setPlaylists(stored.playlists)
    } else {
      setPlaylists([createDefaultPlaylist()])
    }
    if (stored.likedSongs) setLikedSongs(stored.likedSongs)
    if (stored.queue) setQueue(stored.queue)
    if (stored.playbackPosition !== undefined) setPlaybackPosition(stored.playbackPosition)
    if (stored.volume !== undefined) setVolume(stored.volume)
    if (stored.shuffle !== undefined) setShuffle(stored.shuffle)
    if (stored.repeat) setRepeat(stored.repeat)
    if (stored.theme) setTheme(stored.theme)
    if (stored.videoMode !== undefined) setVideoMode(stored.videoMode)
    setIsInitialized(true)
  }, [])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!isInitialized) return

    saveState({
      currentTrack,
      currentPlaylistId,
      playlists,
      likedSongs,
      queue,
      playbackPosition,
      volume,
      shuffle,
      repeat,
      theme,
      videoMode,
    })
  }, [
    currentTrack,
    currentPlaylistId,
    playlists,
    likedSongs,
    queue,
    playbackPosition,
    volume,
    shuffle,
    repeat,
    theme,
    videoMode,
    isInitialized,
  ])

  // Apply theme
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [theme])

  const addPlaylist = (name: string, description?: string, coverImage?: string) => {
    const newPlaylist: Playlist = {
      id: crypto.randomUUID(),
      name,
      description: description || "",
      coverImage,
      tracks: [],
      createdAt: Date.now(),
    }
    setPlaylists([...playlists, newPlaylist])
  }

  const deletePlaylist = (id: string) => {
    setPlaylists(playlists.filter((p) => p.id !== id))
    if (currentPlaylistId === id) {
      setCurrentPlaylistId(null)
    }
  }

  const renamePlaylist = (id: string, name: string) => {
    setPlaylists(playlists.map((p) => (p.id === id ? { ...p, name } : p)))
  }

  const updatePlaylistDescription = (id: string, description: string) => {
    setPlaylists(playlists.map((p) => (p.id === id ? { ...p, description } : p)))
  }

  const updatePlaylistCover = (id: string, coverImage: string) => {
    setPlaylists(playlists.map((p) => (p.id === id ? { ...p, coverImage } : p)))
  }

  const addTrackToPlaylist = (playlistId: string, track: Track) => {
    setPlaylists(
      playlists.map((p) => {
        if (p.id === playlistId) {
          // Check if track already exists
          if (p.tracks.some((t) => t.id === track.id)) {
            return p
          }
          return { ...p, tracks: [...p.tracks, track] }
        }
        return p
      }),
    )
  }

  const removeTrackFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(
      playlists.map((p) => {
        if (p.id === playlistId) {
          return { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) }
        }
        return p
      }),
    )
  }

  const reorderPlaylistTracks = (playlistId: string, tracks: Track[]) => {
    setPlaylists(playlists.map((p) => (p.id === playlistId ? { ...p, tracks } : p)))
  }

  const addToQueue = (track: Track) => {
    setQueue([...queue, track])
  }

  const removeFromQueue = (index: number) => {
    setQueue(queue.filter((_, i) => i !== index))
  }

  const toggleShuffle = () => {
    setShuffle(!shuffle)
  }

  const toggleRepeat = () => {
    setRepeat(repeat === "off" ? "all" : repeat === "all" ? "one" : "off")
  }

  const toggleVideoMode = () => {
    setVideoMode(!videoMode)
  }

  const toggleLikedSong = (track: Track) => {
    const isLiked = likedSongs.some((t) => t.id === track.id)
    if (isLiked) {
      setLikedSongs(likedSongs.filter((t) => t.id !== track.id))
    } else {
      setLikedSongs([...likedSongs, track])
    }
  }

  const isTrackLiked = (trackId: string): boolean => {
    return likedSongs.some((t) => t.id === trackId)
  }

  const addRecentlyPlayed = (item: { type: "track" | "playlist"; id: string }) => {
    setRecentlyPlayed((prev) => {
      const newItem = { ...item, timestamp: Date.now() }
      const filtered = prev.filter((i) => !(i.type === item.type && i.id === item.id))
      return [newItem, ...filtered].slice(0, 10) // Keep last 10 items
    })
  }

  return (
    <AppContext.Provider
      value={{
        currentTrack,
        currentPlaylistId,
        playlists,
        likedSongs,
        queue,
        playbackPosition,
        volume,
        shuffle,
        repeat,
        theme,
        videoMode,
        setCurrentTrack,
        setCurrentPlaylistId,
        setPlaylists,
        addPlaylist,
        deletePlaylist,
        renamePlaylist,
        updatePlaylistDescription,
        updatePlaylistCover,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        reorderPlaylistTracks,
        setQueue,
        addToQueue,
        removeFromQueue,
        setPlaybackPosition,
        setVolume,
        toggleShuffle,
        toggleRepeat,
        setTheme,
        toggleVideoMode,
        toggleLikedSong,
        isTrackLiked,
        setLikedSongs,
        recentlyPlayed,
        addRecentlyPlayed,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within AppProvider")
  }
  return context
}
