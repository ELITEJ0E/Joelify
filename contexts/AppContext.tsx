"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { type AppState, type Playlist, type Track, loadState, saveState, createDefaultPlaylist } from "@/lib/storage"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged, User } from "firebase/auth"
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore"

interface RecentlyPlayed {
  type: "track" | "playlist"
  id: string
  timestamp: number
}

type PlaybackSource = "youtube" | "spotify" | "suno"

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
  setCustomTheme: (colors: { primary: string; accent: string }) => void
  customTheme?: { primary: string; accent: string }
  playbackSource: PlaybackSource
  setPlaybackSource: (source: PlaybackSource) => void
  spotifyPlayer: any
  setSpotifyPlayer: (player: any) => void
  audioSettings: {
    crossfadeDuration: number
    gaplessPlayback: boolean
    eqPreset: string
    customEQ: number[]
    youtubeQuality: "audio" | "360p" | "720p" | "1080p"
    spotifyQuality: "normal" | "high" | "veryhigh"
    realAudioEngine: boolean
  }
  setAudioSettings: (settings: AppContextType["audioSettings"]) => void
  audioElement: HTMLAudioElement | null
  setAudioElement: (element: HTMLAudioElement | null) => void
  audioContext: AudioContext | null
  setAudioContext: (context: AudioContext | null) => void
  analyserNode: AnalyserNode | null
  setAnalyserNode: (node: AnalyserNode | null) => void
  currentBPM: number
  setCurrentBPM: (bpm: number) => void
  beatPulse: number
  setBeatPulse: (pulse: number) => void
  joelsSongs: Track[]
  setJoelsSongs: (songs: Track[]) => void
  user: User | null
}

const FALLBACK_JOELS_SONGS: Track[] = [
  { id: "c0b11db7-a280-4472-804d-665a3964fe75", title: "I Do (ori.ver)", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/image_c0b11db7-a280-4472-804d-665a3964fe75.jpeg" },
  { id: "592ac792-0d91-4912-b7a8-1d601f277ffe", title: "I Do (wedding.ver)", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/image_592ac792-0d91-4912-b7a8-1d601f277ffe.jpeg" },
  { id: "54aec49b-119c-46c8-a81f-9c718e4ab374", title: "I Do (bright)", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/image_54aec49b-119c-46c8-a81f-9c718e4ab374.jpeg" },
  { id: "aba59ff3-0dc0-456a-b3c5-b69c2b229722", title: "I Do (90s.ver)", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/image_aba59ff3-0dc0-456a-b3c5-b69c2b229722.jpeg" },
  { id: "bd216e5e-4604-48e2-ac6e-7f1698044908", title: "红唇转圈", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/3e4680bd-d807-40f8-8ab4-d0e86800d44e.jpeg?width=100" },
  { id: "15095bb6-e6fc-491a-8e6c-0fe284c8b539", title: "红唇转圈 (male.ver)", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/image_15095bb6-e6fc-491a-8e6c-0fe284c8b539.jpeg" },
  { id: "93071252-c3b8-48cf-8fba-29af58e06fa7", title: "红唇转圈 (male + female.ver)", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/image_93071252-c3b8-48cf-8fba-29af58e06fa7.jpeg" },
  { id: "aff5c48b-1c9a-48e1-8f3a-75e6dc9b6165", title: "Sweetheart Pulse", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/image_aff5c48b-1c9a-48e1-8f3a-75e6dc9b6165.jpeg" },
  { id: "fb92ee0d-ec81-4b13-adff-665d4ce72959", title: "霓虹坠落", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/454dc708-54ae-4e5c-923e-86f3c3a6017d.jpeg?width=100" },
  { id: "fae0bffa-8b42-4efe-ad48-06beec264ed6", title: "霓虹坠落（guzheng ver)", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/59dcf2f0-3c9d-44fc-98ca-5028c884dbc1.jpeg?width=100" },
  { id: "dae2c3e3-5c80-4c86-ba69-f7aca9b393ad", title: "灯一亮就", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/260a7eb5-2093-4d4d-bfbc-7912459816e5.jpeg" },
  { id: "71adb5b0-2a9a-4409-84fd-7b57666728cb", title: "霓虹贴身", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/5b3734e2-410b-41cc-b24d-c3f2220afda2.jpeg?width=100" },
  { id: "269a9621-677f-4864-8193-4b2265cd73cc", title: "Light It Up Tonight", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/cdea3ba4-5f38-4462-968f-1fb74ba5ac92.jpeg" },
  { id: "256a7d2a-f304-4498-afe5-50d888e92f82", title: "Light It Up (short)", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/image_256a7d2a-f304-4498-afe5-50d888e92f82.jpeg" },
  { id: "2239a5e6-3ade-443e-aa21-091376583af2", title: "Light It Up", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/a9493a70-6b86-4f80-ab59-d10d676d4443.jpeg" },
  { id: "290650dc-28cb-4412-9347-f2ca5c9ed891", title: "Light It Up 2 (short)", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/image_290650dc-28cb-4412-9347-f2ca5c9ed891.jpeg" },
  { id: "2ebad459-81ee-40bf-bdaf-dfc7d90cd1e0", title: "Light It Up 2", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/18f34ffd-7dc7-4d17-81b4-5d64f12dcce6.jpeg" },
]

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
  const [customTheme, setCustomThemeState] = useState<{ primary: string; accent: string } | undefined>(undefined)
  const [isInitialized, setIsInitialized] = useState(false)
  const [playbackSource, setPlaybackSource] = useState<PlaybackSource>("youtube")
  const [spotifyPlayer, setSpotifyPlayer] = useState<any>(null)
  const [audioSettings, setAudioSettingsState] = useState({
    crossfadeDuration: 0,
    gaplessPlayback: true,
    eqPreset: "Flat",
    customEQ: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    youtubeQuality: "audio" as const,
    spotifyQuality: "high" as const,
    realAudioEngine: true,
  })
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)
  const [currentBPM, setCurrentBPM] = useState<number>(0)
  const [beatPulse, setBeatPulse] = useState<number>(0)
  const [joelsSongs, setJoelsSongs] = useState<Track[]>(FALLBACK_JOELS_SONGS)
  const [user, setUser] = useState<User | null>(null)

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  // Load state from localStorage or Firebase on mount/login
  useEffect(() => {
    const loadData = async () => {
      let stored: Partial<AppState> = {}
      
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid)
          const docSnap = await getDoc(docRef)
          if (docSnap.exists()) {
            const data = docSnap.data()
            if (data.appState) {
              stored = JSON.parse(data.appState)
            }
          } else {
            stored = loadState() // Fallback to local storage if no cloud data
          }
        } catch (error) {
          console.error("Failed to load from Firebase:", error)
          stored = loadState()
        }
      } else {
        stored = loadState()
      }

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
      if (stored.customTheme) setCustomThemeState(stored.customTheme)
      if (stored.playbackSource) setPlaybackSource(stored.playbackSource as PlaybackSource)
      if (stored.audioSettings) setAudioSettingsState(stored.audioSettings)
      
      const savedJoels = localStorage.getItem('joels_custom_songs')
      if (savedJoels) {
        try {
          let parsed: Track[] = JSON.parse(savedJoels)
          // Ensure all fallback songs are present
          const missingFallbacks = FALLBACK_JOELS_SONGS.filter(
            f => !parsed.some(p => p.id === f.id)
          )
          if (missingFallbacks.length > 0) {
            parsed = [...missingFallbacks, ...parsed]
          }
          setJoelsSongs(parsed)
        } catch (e) {
          console.error("Failed to load Joel's music from storage", e)
          setJoelsSongs(FALLBACK_JOELS_SONGS)
        }
      }

      setIsInitialized(true)
    }

    loadData()
  }, [user])

  // Listen for real-time updates from Firebase
  useEffect(() => {
    if (!user || !isInitialized) return

    const docRef = doc(db, "users", user.uid)
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        if (data.appState) {
          try {
            const stored = JSON.parse(data.appState)
            // Only update if the data is different to avoid infinite loops
            // For simplicity, we just update playlists and liked songs from cloud
            if (stored.playlists) setPlaylists(stored.playlists)
            if (stored.likedSongs) setLikedSongs(stored.likedSongs)
          } catch (e) {
            console.error("Error parsing cloud state", e)
          }
        }
      }
    }, (error) => {
      console.error("Firestore Error: ", JSON.stringify({
        error: error.message,
        operationType: "get",
        path: `users/${user.uid}`
      }))
    })

    return () => unsubscribe()
  }, [user, isInitialized])

  useEffect(() => {
    if (!isInitialized) return
    localStorage.setItem('joels_custom_songs', JSON.stringify(joelsSongs))
  }, [joelsSongs, isInitialized])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!isInitialized) return

    const stateToSave = {
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
      customTheme,
      playbackSource,
      audioSettings,
    }

    saveState(stateToSave)
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
    customTheme,
    playbackSource,
    audioSettings,
    isInitialized
  ])

  // Save state to Firebase whenever it changes (debounced and excluding frequent updates)
  useEffect(() => {
    if (!isInitialized || !user) return

    const stateToSave = {
      currentTrack,
      currentPlaylistId,
      playlists,
      likedSongs,
      queue,
      // We exclude playbackPosition from frequent Firebase sync to save quota.
      // It will still be saved whenever other properties change.
      playbackPosition, 
      volume,
      shuffle,
      repeat,
      theme,
      videoMode,
      customTheme,
      playbackSource,
      audioSettings,
    }

    const saveToFirebase = async () => {
      try {
        const docRef = doc(db, "users", user.uid)
        const docSnap = await getDoc(docRef)
        
        const dataToSave = {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "",
          photoURL: user.photoURL || "",
          appState: JSON.stringify(stateToSave),
          updatedAt: Date.now()
        }
        
        if (docSnap.exists()) {
          await setDoc(docRef, {
            ...dataToSave,
            createdAt: docSnap.data().createdAt
          }, { merge: true })
        } else {
          await setDoc(docRef, {
            ...dataToSave,
            createdAt: Date.now()
          })
        }
      } catch (error: any) {
        // Check for quota exceeded specifically
        if (error.message?.includes("quota") || error.code === "resource-exhausted") {
          console.warn("Firestore Quota Exceeded. Cloud sync disabled for today.")
        }
        
        console.error("Firestore Error: ", JSON.stringify({
          error: error.message,
          operationType: "write",
          path: `users/${user.uid}`
        }))
      }
    }
    
    // Use a much longer debounce for Firebase (10 seconds)
    // and exclude playbackPosition from dependencies to avoid triggering on every second
    const timeoutId = setTimeout(saveToFirebase, 10000)
    return () => clearTimeout(timeoutId)
  }, [
    currentTrack,
    currentPlaylistId,
    playlists,
    likedSongs,
    queue,
    // playbackPosition excluded from dependencies
    volume,
    shuffle,
    repeat,
    theme,
    videoMode,
    customTheme,
    playbackSource,
    audioSettings,
    isInitialized,
    user
  ])

  // Apply theme
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty("--color-primary", customTheme?.primary || "")
    document.documentElement.style.setProperty("--color-accent", customTheme?.accent || "")
  }, [customTheme])

  // Prevent context menu (right-click) on images
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === "IMG" || target.closest("img")) {
        e.preventDefault()
      }
    }

    document.addEventListener("contextmenu", handleContextMenu)
    return () => document.removeEventListener("contextmenu", handleContextMenu)
  }, [])

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

  const setCustomTheme = (colors: { primary: string; accent: string }) => {
    setCustomThemeState(colors)
  }

  const setAudioSettings = (settings: typeof audioSettings) => {
    setAudioSettingsState(settings)
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
        customTheme,
        setCustomTheme,
        playbackSource,
        setPlaybackSource,
        spotifyPlayer,
        setSpotifyPlayer,
        audioSettings,
        setAudioSettings,
        audioElement,
        setAudioElement,
        audioContext,
        setAudioContext,
        analyserNode,
        setAnalyserNode,
        currentBPM,
        setCurrentBPM,
        beatPulse,
        setBeatPulse,
        joelsSongs,
        setJoelsSongs,
        user
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
