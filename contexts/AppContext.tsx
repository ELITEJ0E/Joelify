"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { type AppState, type Playlist, type Track, loadState, saveState, createDefaultPlaylist } from "@/lib/storage"

interface AppContextType extends AppState {
  setCurrentTrack: (track: Track | null) => void
  setCurrentPlaylistId: (id: string | null) => void
  setPlaylists: (playlists: Playlist[]) => void
  addPlaylist: (name: string) => void
  deletePlaylist: (id: string) => void
  renamePlaylist: (id: string, name: string) => void
  addTrackToPlaylist: (playlistId: string, track: Track) => void
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void
  reorderPlaylistTracks: (playlistId: string, tracks: Track[]) => void
  setQueue: (queue: Track[]) => void
  addToQueue: (track: Track) => void
  removeFromQueue: (index: number) => void
  setPlaybackPosition: (position: number) => void
  setVolume: (volume: number) => void
  toggleShuffle: () => void
  toggleRepeat: () => void
  setTheme: (theme: "light" | "dark") => void
  toggleVideoMode: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [queue, setQueue] = useState<Track[]>([])
  const [playbackPosition, setPlaybackPosition] = useState(0)
  const [volume, setVolume] = useState(50)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("off")
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const [videoMode, setVideoMode] = useState(false)
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

  const addPlaylist = (name: string) => {
    const newPlaylist: Playlist = {
      id: crypto.randomUUID(),
      name,
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

  return (
    <AppContext.Provider
      value={{
        currentTrack,
        currentPlaylistId,
        playlists,
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
