"use client"

import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react"
import { type AppState, type Playlist, type Track, loadState, saveState, createDefaultPlaylist } from "@/lib/storage"
import { FALLBACK_JOELS_SONGS } from "@/lib/constants"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged, User } from "firebase/auth"
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore"

interface RecentlyPlayed {
  type: "track" | "playlist"
  id: string
  timestamp: number
}

type PlaybackSource = "youtube" | "suno" | "local"

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
  audioSettings: {
    crossfadeDuration: number
    gaplessPlayback: boolean
    eqPreset: string
    customEQ: number[]
    youtubeQuality: "audio" | "360p" | "720p" | "1080p"
    realAudioEngine: boolean
  }
  setAudioSettings: (settings: AppContextType["audioSettings"]) => void
  audioElement: HTMLAudioElement | null
  setAudioElement: (element: HTMLAudioElement | null) => void
  joelsSongs: Track[]
  setJoelsSongs: (songs: Track[]) => void
  user: User | null
  isInitialized: boolean
}

const AppContext = createContext<AppContextType | undefined>(undefined)

const mergeTrackWithFallback = (track: Track, fallback?: Track) => {
  let syncedThumbnail = undefined;
  let syncedLyrics = undefined;
  if (typeof window !== "undefined") {
    try {
      const globalThumbnailsStr = localStorage.getItem("joely_synced_thumbnails_cache");
      if (globalThumbnailsStr) {
        const cache = JSON.parse(globalThumbnailsStr);
        if (cache && cache[track.id]) {
          syncedThumbnail = cache[track.id];
        }
      }
      const globalLyricsStr = localStorage.getItem("joely_synced_lyrics_cache");
      if (globalLyricsStr) {
        const cache = JSON.parse(globalLyricsStr);
        if (cache && cache[track.id]) {
          syncedLyrics = cache[track.id];
        }
      }
    } catch {}
  }

  const base = fallback ? { ...fallback, ...track } : track;
  const isFallbackVideo = fallback?.thumbnail?.includes('.mp4') || fallback?.thumbnail?.includes('video_upload');
  const isTrackVideo = track.thumbnail?.includes('.mp4') || track.thumbnail?.includes('video_upload');
  
  let finalThumbnail = syncedThumbnail || track.thumbnail || fallback?.thumbnail;
  if (!track.thumbnail && isFallbackVideo) {
    finalThumbnail = fallback?.thumbnail;
  }

  return {
    ...base,
    thumbnail: finalThumbnail,
    lyrics: syncedLyrics || track.lyrics || fallback?.lyrics || ""
  };
};

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
  const [audioSettings, setAudioSettingsState] = useState<{
    crossfadeDuration: number;
    gaplessPlayback: boolean;
    eqPreset: string;
    customEQ: number[];
    youtubeQuality: "audio" | "360p" | "720p" | "1080p";
    realAudioEngine: boolean;
  }>({
    crossfadeDuration: 0,
    gaplessPlayback: true,
    eqPreset: "Flat",
    customEQ: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    youtubeQuality: "audio",
    realAudioEngine: true,
  })
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [joelsSongs, setJoelsSongs] = useState<Track[]>([...FALLBACK_JOELS_SONGS].reverse())
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

      if (stored.currentTrack) {
        const fallback = FALLBACK_JOELS_SONGS.find(f => f.id === stored.currentTrack?.id);
        setCurrentTrack(mergeTrackWithFallback(stored.currentTrack, fallback));
      }
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
      if (stored.audioSettings) {
        setAudioSettingsState(prev => ({ ...prev, ...stored.audioSettings }))
      }
      
      const JOEL_PLAYLIST_ID = "ff247038-e0ae-4778-989d-0529e575027b";
      const activePlaylistId = localStorage.getItem('joel_sync_playlist_id') || JOEL_PLAYLIST_ID;
      const cachedKey = `joely_tracks_${activePlaylistId}`;
      const savedTracksStr = localStorage.getItem(cachedKey) || localStorage.getItem('joels_custom_songs');
      
      let joelSongsToLoad: Track[] = [];
      if (savedTracksStr) {
        try {
          let parsed: Track[] = JSON.parse(savedTracksStr);
          parsed = parsed.map(pTrack => {
            const fallback = FALLBACK_JOELS_SONGS.find(f => f.id === pTrack.id);
            return mergeTrackWithFallback(pTrack, fallback);
          });
          
          if (activePlaylistId === JOEL_PLAYLIST_ID) {
            const missingFallbacks = FALLBACK_JOELS_SONGS.filter(
              f => !parsed.some(p => p.id === f.id)
            );
            if (missingFallbacks.length > 0) {
              parsed = [...missingFallbacks, ...parsed];
            }
          }
          joelSongsToLoad = parsed;
        } catch (e) {
          console.error("Failed to load Joel's partition music from storage", e);
          joelSongsToLoad = [...FALLBACK_JOELS_SONGS].reverse();
        }
      } else {
        joelSongsToLoad = [...FALLBACK_JOELS_SONGS].reverse();
      }
      
      // Ensure all tracks in joelSongsToLoad have their synced thumbnails resolved
      joelSongsToLoad = joelSongsToLoad.map(s => {
        const fb = FALLBACK_JOELS_SONGS.find(f => f.id === s.id);
        return mergeTrackWithFallback(s, fb);
      });
      setJoelsSongs(joelSongsToLoad);

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

  const handleSetCurrentTrack = (track: Track | null) => {
    if (track) {
      const fallback = FALLBACK_JOELS_SONGS.find(f => f.id === track.id)
      setCurrentTrack(mergeTrackWithFallback(track, fallback))
    } else {
      setCurrentTrack(null)
    }
  }

  // Background Sync Service for Joel's Music Playlists
  useEffect(() => {
    if (!isInitialized) return;

    const backgroundSyncPlaylists = async () => {
      const PLAY_IDS = [
        "ff247038-e0ae-4778-989d-0529e575027b", // Originals
        "627c2d15-0cca-4c07-91b3-5f203c981e6e", // Worship
        "34ac065b-e68e-4dfa-9780-00c49bae047a"  // Upcoming
      ];

      for (const id of PLAY_IDS) {
        const isSyncedAlready = localStorage.getItem(`joely_playlist_synced_${id}`) === "true";
        const hasCachedTracks = !!localStorage.getItem(`joely_tracks_${id}`);
        
        // If already synced and has cached tracks, skip to save bandwidth & respect preferences
        if (isSyncedAlready && hasCachedTracks) {
          console.log(`[Joelify Sync] Playlist ${id} is already cached and synced previously. Skipping background sync.`);
          continue;
        }

        console.log(`[Joelify Sync] Background fetching Joel's playlist: ${id}...`);
        
        try {
          const res = await fetch(`/api/suno-playlist?id=${id}&_t=${Date.now()}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const serverData = await res.json();
          
          if (serverData?.tracks && serverData.tracks.length > 0) {
            // Success! Save tracks partition
            processAndCacheSyncedPlaylist(id, serverData.tracks);
          }
        } catch (err) {
          console.warn(`[Joelify Sync] Background sync failed for ${id}. Error:`, err);
        }
      }
    };

    const processAndCacheSyncedPlaylist = (id: string, incomingTracks: Track[]) => {
      const cachedKey = `joely_tracks_${id}`;
      
      // Update our global thumbnail & lyrics cache first
      let thumbCache: Record<string, string> = {};
      try {
        const existing = localStorage.getItem("joely_synced_thumbnails_cache");
        if (existing) thumbCache = JSON.parse(existing);
      } catch {}

      let lyricsCache: Record<string, string> = {};
      try {
        const existing = localStorage.getItem("joely_synced_lyrics_cache");
        if (existing) lyricsCache = JSON.parse(existing);
      } catch {}

      incomingTracks.forEach((t) => {
        if (t.id) {
          if (t.thumbnail) thumbCache[t.id] = t.thumbnail;
          if (t.lyrics) lyricsCache[t.id] = t.lyrics;
        }
      });

      try {
        localStorage.setItem("joely_synced_thumbnails_cache", JSON.stringify(thumbCache));
        localStorage.setItem("joely_synced_lyrics_cache", JSON.stringify(lyricsCache));
      } catch (e) {
        console.error("Failed to save global caches", e);
      }

      // Read current cached tracks or fallbacks to merge and preserve user customization/ordering
      let cachedTracks: Track[] = [];
      const cachedStr = localStorage.getItem(cachedKey);
      if (cachedStr) {
        try { cachedTracks = JSON.parse(cachedStr); } catch (e) {}
      } else if (id === "ff247038-e0ae-4778-989d-0529e575027b") {
        cachedTracks = [...FALLBACK_JOELS_SONGS].reverse();
      }

      const incomingTrackIds = new Set(incomingTracks.map((t) => t.id));
      const activeCached = cachedTracks.filter((t) => t && t.id && incomingTrackIds.has(t.id));
      
      const updatedCached = activeCached.map((oldTrack) => {
        const liveTrack = incomingTracks.find((t) => t.id === oldTrack.id);
        return { ...oldTrack, ...liveTrack };
      });
      
      const uniqueNewTracks = incomingTracks.filter((t) => !activeCached.some((old) => old && old.id === t.id));
      const mergedTracks = [...updatedCached, ...uniqueNewTracks].map((t) => {
        const fb = FALLBACK_JOELS_SONGS.find((f) => f.id === t.id);
        return mergeTrackWithFallback(t, fb);
      });

      localStorage.setItem(cachedKey, JSON.stringify(mergedTracks));
      localStorage.setItem(`joely_playlist_synced_${id}`, "true");

      // Exception: if this background synced playlist is the one currently loaded in player/active view,
      // update the local state instantly so that the ui gets fresh thumbnails automatically!
      const currentActiveId = localStorage.getItem("joel_sync_playlist_id") || "ff247038-e0ae-4778-989d-0529e575027b";
      if (id === currentActiveId) {
        setJoelsSongs(mergedTracks);
      }
    };

    // Delay background sync slightly so the initial page mount is ultra responsive
    const timer = setTimeout(() => {
      backgroundSyncPlaylists();
    }, 2000);

    return () => clearTimeout(timer);
  }, [isInitialized]);

  const value = useMemo(
    () => ({
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
      setCurrentTrack: handleSetCurrentTrack,
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
      audioSettings,
      setAudioSettings,
      audioElement,
      setAudioElement,
      joelsSongs,
      setJoelsSongs,
      user,
      isInitialized,
    }),
    [
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
      handleSetCurrentTrack,
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
      audioSettings,
      setAudioSettings,
      audioElement,
      setAudioElement,
      joelsSongs,
      setJoelsSongs,
      user,
      isInitialized,
    ]
  )

  return (
    <AppContext.Provider value={value}>
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
