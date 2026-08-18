"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  Search,
  Play,
  ListPlus,
  Heart,
  Music2,
  Disc3,
  User,
  ListMusic,
  Video,
  ChevronDown,
  MoreVertical,
  Loader2,
  Sparkles,
  Share2,
  Check,
  Flame,
  ArrowRight,
  TrendingUp,
} from "lucide-react"
import { TrackImage as Image } from "./TrackImage"
import type {
  SearchResult,
  SearchResultType,
  MusicSearchResponse,
  SearchShelf,
} from "@/lib/music/types"
import { useApp } from "@/contexts/AppContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DiscoverMore } from "./DiscoverMore"
import { getCachedData, setCachedData } from "@/lib/cache"
import { ALL_REGIONS, ASIAN_REGIONS, INTERNATIONAL_REGIONS, FEATURED_REGIONS, getRegion } from "@/lib/regions"

const loadingMessages = [
  "Searching YouTube Music...",
  "Retrieving songs, albums, and artists...",
  "Formatting audio soundwaves...",
  "Joelifying your search...",
  "Tuning into the beat...",
]

interface CachedSearch {
  response: MusicSearchResponse
}

interface VideoItem {
  id: string
  title: string
  artist: string
  thumbnail: string
  viewCount?: string
}

const GENRES = [
  { name: "Pop", color: "from-blue-600 to-indigo-900" },
  { name: "Hip-Hop", color: "from-amber-600 to-red-900" },
  { name: "K-Pop", color: "from-pink-600 to-purple-900" },
  { name: "Rock", color: "from-red-600 to-zinc-900" },
  { name: "R&B", color: "from-purple-600 to-indigo-900" },
  { name: "EDM", color: "from-emerald-600 to-teal-900" },
  { name: "City Pop", color: "from-fuchsia-600 to-rose-900" },
  { name: "Indie", color: "from-teal-600 to-slate-900" },
]

function toTrack(result: SearchResult) {
  return {
    id: result.videoId ?? result.id,
    title: result.title,
    artist: result.artist,
    thumbnail: result.thumbnail,
    duration: result.duration || "0:00",
    album: result.album,
  }
}

type FilterChip = "all" | "songs" | "albums" | "artists" | "videos" | "playlists"

interface SearchViewProps {
  onNavigate?: (view: any, params?: any) => void
  onOpenSidebar?: () => void
  initialQuery?: string
}

export function SearchView({ onNavigate, onOpenSidebar, initialQuery = "" }: SearchViewProps) {
  const [query, setQuery] = useState(initialQuery)
  const [activeFilter, setActiveFilter] = useState<FilterChip>("all")
  const [searchResponse, setSearchResponse] = useState<MusicSearchResponse | null>(null)
  const [continuation, setContinuation] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0])
  const [lastQuery, setLastQuery] = useState("")

  // Explore State
  const [regionCode, setRegionCode] = useState("MY")
  const [heroVideos, setHeroVideos] = useState<VideoItem[]>([])
  const [trendingVideos, setTrendingVideos] = useState<VideoItem[]>([])
  const [exploreLoading, setExploreLoading] = useState(true)
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [genreVideos, setGenreVideos] = useState<VideoItem[]>([])
  const [genreLoading, setGenreLoading] = useState(false)

  const searchAbortRef = useRef<AbortController | null>(null)
  const suggestAbortRef = useRef<AbortController | null>(null)
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchBoxRef = useRef<HTMLDivElement>(null)

  const {
    playlists,
    addTrackToPlaylist,
    setCurrentTrack,
    setQueue,
    addToQueue,
    toggleLikedSong,
    isTrackLiked,
    setPlaybackSource,
  } = useApp()

  // Fetch Explore Feed on load & region change
  useEffect(() => {
    fetchExploreData(regionCode)
  }, [regionCode])

  useEffect(() => {
    if (initialQuery && initialQuery !== lastQuery) {
      setQuery(initialQuery)
      runSearch(initialQuery)
    }
  }, [initialQuery])

  const fetchExploreData = async (region: string) => {
    const cacheKey = `explore_data_${region}`
    const cached = getCachedData<any>(cacheKey)
    if (cached) {
      setHeroVideos(cached.hero || [])
      setTrendingVideos(cached.trending || [])
      setExploreLoading(false)
      return
    }

    setExploreLoading(true)
    try {
      const res = await fetch(`/api/explore?regionCode=${encodeURIComponent(region)}`)
      if (res.ok) {
        const data = await res.json()
        setHeroVideos(data.hero || [])
        setTrendingVideos(data.trending || [])
        setCachedData(cacheKey, data)
      }
    } catch (err) {
      console.error("[SearchView] Explore fetch error:", err)
    } finally {
      setExploreLoading(false)
    }
  }

  const handleSelectGenre = async (genreName: string) => {
    setSelectedGenre(genreName)
    setGenreLoading(true)

    const cacheKey = `genre_${genreName}_${regionCode}`
    const cached = getCachedData<VideoItem[]>(cacheKey)
    if (cached) {
      setGenreVideos(cached)
      setGenreLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/explore?genre=${encodeURIComponent(genreName)}&regionCode=${encodeURIComponent(regionCode)}`)
      if (res.ok) {
        const data = await res.json()
        setGenreVideos(data.videos || [])
        setCachedData(cacheKey, data.videos || [])
      }
    } catch (err) {
      console.error("[SearchView] Genre fetch error:", err)
    } finally {
      setGenreLoading(false)
    }
  }

  // Debounced search suggestions
  useEffect(() => {
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)
    const q = query.trim()
    if (q.length < 2 || q === lastQuery) {
      setSuggestions([])
      setSelectedIndex(-1)
      return
    }
    suggestTimerRef.current = setTimeout(async () => {
      suggestAbortRef.current?.abort()
      const controller = new AbortController()
      suggestAbortRef.current = controller
      try {
        const res = await fetch(`/api/music/suggestions?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        const data = await res.json()
        if (!controller.signal.aborted) {
          setSuggestions(data.suggestions ?? [])
          setShowSuggestions(true)
          setSelectedIndex(-1)
        }
      } catch {
        // best-effort
      }
    }, 250)
    return () => {
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)
    }
  }, [query, lastQuery])

  // Close suggestions on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
        setSelectedIndex(-1)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault()
        const selected = suggestions[selectedIndex]
        setQuery(selected)
        runSearch(selected)
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false)
      setSelectedIndex(-1)
    }
  }

  const runSearch = useCallback(async (rawQuery: string) => {
    const trimmed = rawQuery.trim()
    if (!trimmed) return

    let searchQuery = trimmed
    const urlPattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    const match = trimmed.match(urlPattern)
    if (match) searchQuery = match[1]

    setShowSuggestions(false)
    setSuggestions([])
    setLastQuery(trimmed)
    setIsLoading(true)
    setError(null)
    setActiveFilter("all")
    setLoadingMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)])

    searchAbortRef.current?.abort()
    const controller = new AbortController()
    searchAbortRef.current = controller

    try {
      const cacheKey = `music_search_v2_${searchQuery.toLowerCase()}`
      const cached = getCachedData<CachedSearch>(cacheKey, sessionStorage)

      if (cached) {
        setSearchResponse(cached.response)
        setContinuation(cached.response.continuation ?? null)
      } else {
        const res = await fetch(`/api/music/search?q=${encodeURIComponent(searchQuery)}`, { signal: controller.signal })
        const data: MusicSearchResponse = await res.json()
        if (controller.signal.aborted) return

        if (data.error && (!data.results || data.results.length === 0)) {
          setError(data.error)
          setSearchResponse(null)
          setContinuation(null)
        } else {
          setSearchResponse(data)
          setContinuation(data.continuation ?? null)
          setCachedData(cacheKey, { response: data }, sessionStorage)
        }
      }
      setIsLoading(false)
    } catch (err: any) {
      if (err?.name === "AbortError") return
      console.error("[SearchView] Search failed:", err)
      setIsLoading(false)
      setError("Failed to fetch search results.")
    }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    runSearch(query)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    runSearch(suggestion)
  }

  const handleLoadMoreSongs = async () => {
    if (!continuation || isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const res = await fetch(`/api/music/continuation?token=${encodeURIComponent(continuation)}`)
      const data = await res.json()
      if (data.results?.length > 0) {
        setSearchResponse((prev) => {
          if (!prev) return prev
          const currentSongs = prev.shelves.songs?.items ?? []
          const seen = new Set(currentSongs.map((r) => r.videoId ?? r.id))
          const newSongs = data.results.filter((r: SearchResult) => !seen.has(r.videoId ?? r.id))
          const updatedSongs = [...currentSongs, ...newSongs]

          return {
            ...prev,
            shelves: {
              ...prev.shelves,
              songs: {
                title: "Songs",
                type: "song",
                items: updatedSongs,
                continuation: data.continuation ?? null,
              },
            },
            results: [...prev.results, ...newSongs],
          }
        })
      }
      setContinuation(data.continuation ?? null)
    } catch (err) {
      console.error("[SearchView] Load more songs failed:", err)
      setContinuation(null)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handlePlayNow = (result: SearchResult) => {
    setPlaybackSource("youtube")
    setCurrentTrack(toTrack(result) as any)
  }

  const handlePlaySongQueue = (items: SearchResult[], startIndex: number) => {
    setPlaybackSource("youtube")
    const selected = items[startIndex]
    setCurrentTrack(toTrack(selected) as any)

    const remaining = items.slice(startIndex + 1).map((r) => toTrack(r))
    setQueue(remaining as any)
  }

  const handlePlayExploreTrack = (video: VideoItem, list: VideoItem[], index: number) => {
    setPlaybackSource("youtube")
    setCurrentTrack({
      id: video.id,
      title: video.title,
      artist: video.artist,
      thumbnail: video.thumbnail,
      duration: "0:00",
    })

    const remaining = list.slice(index + 1).map((v) => ({
      id: v.id,
      title: v.title,
      artist: v.artist,
      thumbnail: v.thumbnail,
      duration: "0:00",
    }))
    setQueue(remaining as any)
  }

  const handleOpenAlbum = (browseId: string) => {
    if (onNavigate) {
      onNavigate("album", { albumId: browseId })
    }
  }

  const handleBrowseArtist = (artistName: string) => {
    setQuery(artistName)
    runSearch(artistName)
  }

  const currentRegion = getRegion(regionCode)
  const currentRegionName = currentRegion.name

  const hasResults = searchResponse && (searchResponse.results.length > 0 || searchResponse.topResult)
  const topResult = searchResponse?.topResult
  const shelves = searchResponse?.shelves ?? {}
  const shelfOrder = searchResponse?.shelfOrder ?? ["song", "video", "album", "artist", "playlist"]

  // Filter shelf visibility based on active filter chip
  const showSongs = (activeFilter === "all" || activeFilter === "songs") && shelves.songs && shelves.songs.items.length > 0
  const showVideos = (activeFilter === "all" || activeFilter === "videos") && shelves.videos && shelves.videos.items.length > 0
  const showAlbums = (activeFilter === "all" || activeFilter === "albums") && shelves.albums && shelves.albums.items.length > 0
  const showArtists = (activeFilter === "all" || activeFilter === "artists") && shelves.artists && shelves.artists.items.length > 0
  const showPlaylists = (activeFilter === "all" || activeFilter === "playlists") && shelves.playlists && shelves.playlists.items.length > 0

  return (
    <div className="flex-1 bg-gradient-to-b from-[hsl(var(--primary)/0.06)] via-zinc-950/80 to-black text-foreground p-4 md:p-8 overflow-y-auto pb-32">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* TOP SEARCH HEADER */}
        <div className="pt-2 flex items-center gap-3">
          <form onSubmit={handleSearch} className="flex-1 relative" ref={searchBoxRef}>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={18} />
            <Input
              type="text"
              placeholder="Search songs, albums, artists, or videos..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedIndex(-1)
              }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onKeyDown={handleInputKeyDown}
              className="pl-10 pr-10 h-12 rounded-2xl bg-zinc-900/90 border-white/10 text-white placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-lg"
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden py-1">
                {suggestions.map((s, index) => (
                  <button
                    key={s}
                    type="button"
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                      selectedIndex === index
                        ? "bg-primary/25 text-primary font-semibold"
                        : "text-gray-200 hover:bg-primary/20 hover:text-primary"
                    }`}
                    onClick={() => {
                      handleSuggestionClick(s)
                      setSelectedIndex(-1)
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <Search size={14} className={`shrink-0 ${selectedIndex === index ? "text-primary" : "text-gray-400"}`} />
                    <span className="line-clamp-1">{s}</span>
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Region Selector Pill with categorized Asian & International dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="rounded-2xl border-white/15 bg-zinc-900/90 text-white text-xs font-semibold hover:bg-zinc-800 flex items-center gap-2 h-12 px-3.5 shrink-0 shadow-sm"
              >
                <span>{currentRegion.flag}</span>
                <span className="hidden sm:inline">{currentRegion.name}</span>
                <span className="sm:hidden">{currentRegion.code}</span>
                <ChevronDown size={14} className="text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-zinc-900/95 backdrop-blur-xl border-white/10 text-white max-h-80 overflow-y-auto">
              <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wider text-primary">
                Asian Countries
              </DropdownMenuLabel>
              {ASIAN_REGIONS.map((r) => (
                <DropdownMenuItem
                  key={r.code}
                  onClick={() => setRegionCode(r.code)}
                  className={`hover:bg-primary/20 focus:bg-primary/20 cursor-pointer text-xs flex items-center justify-between ${
                    regionCode === r.code ? "bg-primary/20 font-bold text-primary" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{r.flag}</span>
                    <span>{r.name}</span>
                  </span>
                  {regionCode === r.code && <span className="text-[10px] text-primary">Active</span>}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator className="bg-white/10" />

              <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Global & International
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setRegionCode("GLOBAL")}
                className={`hover:bg-primary/20 focus:bg-primary/20 cursor-pointer text-xs flex items-center justify-between ${
                  regionCode === "GLOBAL" ? "bg-primary/20 font-bold text-primary" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>🌐</span>
                  <span>Global (Worldwide)</span>
                </span>
                {regionCode === "GLOBAL" && <span className="text-[10px] text-primary">Active</span>}
              </DropdownMenuItem>
              {INTERNATIONAL_REGIONS.map((r) => (
                <DropdownMenuItem
                  key={r.code}
                  onClick={() => setRegionCode(r.code)}
                  className={`hover:bg-primary/20 focus:bg-primary/20 cursor-pointer text-xs flex items-center justify-between ${
                    regionCode === r.code ? "bg-primary/20 font-bold text-primary" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{r.flag}</span>
                    <span>{r.name}</span>
                  </span>
                  {regionCode === r.code && <span className="text-[10px] text-primary">Active</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* FILTER CHIPS (Visible when search results exist) */}
        {!isLoading && hasResults && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: "all", label: "All" },
              { id: "songs", label: "Songs", count: shelves.songs?.items.length },
              { id: "albums", label: "Albums", count: shelves.albums?.items.length },
              { id: "artists", label: "Artists", count: shelves.artists?.items.length },
              { id: "videos", label: "Videos", count: shelves.videos?.items.length },
              { id: "playlists", label: "Playlists", count: shelves.playlists?.items.length },
            ].map((chip) => {
              if (chip.id !== "all" && !chip.count) return null
              const isSelected = activeFilter === chip.id
              return (
                <button
                  key={chip.id}
                  onClick={() => setActiveFilter(chip.id as FilterChip)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                    isSelected
                      ? "bg-white text-black shadow-md scale-105"
                      : "bg-zinc-900/90 text-gray-300 border border-white/10 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>
        )}

        {/* LOADING STATE */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary mb-4" size={44} />
            <p className="text-sm font-medium text-gray-400">{loadingMessage}</p>
          </div>
        )}

        {/* ERROR STATE */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-5 mb-6">
            <p className="text-destructive font-bold mb-1">Search Error</p>
            <p className="text-xs text-gray-400 mb-3">{error}</p>
            <Button onClick={() => runSearch(lastQuery || query)} variant="outline" size="sm" className="rounded-full">
              Try Again
            </Button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ACTIVE SEARCH RESULTS — YOUTUBE MUSIC SEMANTIC STRUCTURE                  */}
        {/* ========================================================================= */}
        {!isLoading && hasResults && (
          <div className="space-y-10">
            {/* TOP RESULT SECTION */}
            {activeFilter === "all" && topResult && (
              <div className="space-y-3">
                <h2 className="text-sm font-bold tracking-wider uppercase text-gray-400">Top Result</h2>
                <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 border border-white/[0.08] rounded-2xl p-4 md:p-6 shadow-xl hover:border-primary/30 transition-all">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                    {/* Top Result Artwork */}
                    <div
                      className={`relative shrink-0 overflow-hidden shadow-2xl bg-zinc-800 ${
                        topResult.type === "artist"
                          ? "w-28 h-28 sm:w-36 sm:h-36 rounded-full ring-2 ring-primary/40"
                          : "w-28 h-28 sm:w-36 sm:h-36 rounded-xl"
                      }`}
                    >
                      {topResult.thumbnail ? (
                        <Image
                          src={topResult.thumbnail}
                          alt={topResult.title}
                          fill
                          className="object-cover"
                          sizes="144px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          {topResult.type === "artist" ? <User size={40} /> : <Music2 size={40} />}
                        </div>
                      )}
                    </div>

                    {/* Top Result Metadata */}
                    <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider bg-primary/20 text-primary px-2.5 py-0.5 rounded-full border border-primary/30">
                          {topResult.type}
                        </span>
                        {topResult.year && (
                          <span className="text-xs text-gray-400 font-medium">• {topResult.year}</span>
                        )}
                        {topResult.duration && (
                          <span className="text-xs text-gray-400 font-mono">• {topResult.duration}</span>
                        )}
                      </div>

                      <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white truncate">
                        {topResult.title}
                      </h3>

                      <div className="text-sm text-gray-300 truncate">
                        {topResult.type === "artist" ? (
                          <span className="text-gray-400">Artist</span>
                        ) : (
                          <>
                            <span className="font-semibold text-gray-200">{topResult.artist}</span>
                            {topResult.album && (
                              <>
                                <span className="text-gray-500 mx-1.5">•</span>
                                <span className="text-gray-400">{topResult.album}</span>
                              </>
                            )}
                          </>
                        )}
                      </div>

                      {/* Top Result Actions */}
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
                        {topResult.type === "song" || topResult.type === "video" ? (
                          <>
                            <Button
                              onClick={() => handlePlayNow(topResult)}
                              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 h-10 rounded-full gap-2 shadow-md hover:scale-105 transition-all"
                            >
                              <Play size={16} fill="currentColor" />
                              Play
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => addToQueue(toTrack(topResult) as any)}
                              className="border-white/15 bg-zinc-900/60 hover:bg-zinc-800 text-white rounded-full h-10 px-4 gap-1.5 text-xs"
                            >
                              <ListPlus size={15} />
                              Add to Queue
                            </Button>
                            {topResult.albumEntity?.browseId && (
                              <Button
                                variant="ghost"
                                onClick={() => handleOpenAlbum(topResult.albumEntity!.browseId!)}
                                className="text-primary hover:text-white hover:bg-primary/20 rounded-full h-10 px-4 text-xs gap-1.5"
                              >
                                <Disc3 size={15} />
                                Go to Album
                              </Button>
                            )}
                          </>
                        ) : topResult.type === "album" ? (
                          <Button
                            onClick={() => handleOpenAlbum(topResult.browseId || topResult.id)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 h-10 rounded-full gap-2 shadow-md hover:scale-105 transition-all"
                          >
                            <Disc3 size={16} />
                            Open Album
                          </Button>
                        ) : topResult.type === "artist" ? (
                          <Button
                            onClick={() => handleBrowseArtist(topResult.title)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 h-10 rounded-full gap-2 shadow-md hover:scale-105 transition-all"
                          >
                            <User size={16} />
                            View Artist
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SONGS SHELF — HIGH-DENSITY COMPACT MUSIC ROWS */}
            {showSongs && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music2 size={18} className="text-primary" />
                    <h2 className="text-lg font-bold text-white">Songs</h2>
                  </div>
                  {shelves.songs?.items && (
                    <span className="text-xs text-gray-500 font-medium">
                      {shelves.songs.items.length} tracks
                    </span>
                  )}
                </div>

                <div className="bg-zinc-950/60 border border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
                  {shelves.songs!.items.map((song, index) => {
                    const liked = isTrackLiked(song.videoId ?? song.id)
                    return (
                      <CompactSongRow
                        key={song.id || index}
                        song={song}
                        index={index}
                        liked={liked}
                        playlists={playlists}
                        onPlay={() => handlePlaySongQueue(shelves.songs!.items, index)}
                        onAddToQueue={() => addToQueue(toTrack(song) as any)}
                        onToggleLike={() => toggleLikedSong(toTrack(song) as any)}
                        onAddToPlaylist={(playlistId) => addTrackToPlaylist(playlistId, toTrack(song) as any)}
                        onOpenAlbum={handleOpenAlbum}
                        onBrowseArtist={handleBrowseArtist}
                      />
                    )
                  })}
                </div>

                {/* Continuation for Songs */}
                {continuation && (
                  <div className="pt-2 text-center">
                    <Button
                      variant="outline"
                      onClick={handleLoadMoreSongs}
                      disabled={isLoadingMore}
                      className="rounded-full border-white/15 bg-zinc-900/80 hover:bg-zinc-800 text-white text-xs px-6 h-9 gap-2"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 size={14} className="animate-spin text-primary" />
                          Loading more songs...
                        </>
                      ) : (
                        "Load More Songs"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ALBUMS SHELF — SQUARE ALBUM CARDS WITH DIRECT ALBUM NAVIGATION */}
            {showAlbums && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Disc3 size={18} className="text-primary" />
                  <h2 className="text-lg font-bold text-white">Albums</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {shelves.albums!.items.map((album, idx) => (
                    <AlbumCard
                      key={album.browseId || album.id || idx}
                      album={album}
                      onOpen={() => handleOpenAlbum(album.browseId || album.id)}
                      onBrowseArtist={handleBrowseArtist}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* VIDEOS SHELF — 16:9 VIDEO CARDS */}
            {showVideos && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Video size={18} className="text-primary" />
                  <h2 className="text-lg font-bold text-white">Videos & Performances</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {shelves.videos!.items.map((video, idx) => (
                    <VideoCard
                      key={video.videoId || video.id || idx}
                      video={video}
                      onPlay={() => handlePlayNow(video)}
                      onAddToQueue={() => addToQueue(toTrack(video) as any)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ARTISTS SHELF — CIRCULAR ARTIST AVATARS */}
            {showArtists && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-primary" />
                  <h2 className="text-lg font-bold text-white">Artists</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {shelves.artists!.items.map((artist, idx) => (
                    <ArtistCard
                      key={artist.artistId || artist.id || idx}
                      artist={artist}
                      onOpen={() => handleBrowseArtist(artist.title)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* PLAYLISTS SHELF */}
            {showPlaylists && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ListMusic size={18} className="text-primary" />
                  <h2 className="text-lg font-bold text-white">Community & Curated Playlists</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {shelves.playlists!.items.map((playlist, idx) => (
                    <PlaylistCard
                      key={playlist.playlistId || playlist.id || idx}
                      playlist={playlist}
                      onBrowse={() => runSearch(playlist.title)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* EXPLORE / TRENDING VIEW (SHOWN WHEN NO ACTIVE SEARCH RESULTS)              */}
        {/* ========================================================================= */}
        {!isLoading && !hasResults && (
          <div className="space-y-10 pt-2">
            {/* GENRES QUICK FILTER */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Explore Genres</h3>
              </div>
              <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-hide no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                {GENRES.map((g) => (
                  <button
                    key={g.name}
                    onClick={() => {
                      setQuery(g.name)
                      runSearch(g.name)
                    }}
                    className={`shrink-0 w-32 sm:w-36 md:flex-1 md:w-auto h-16 rounded-xl p-3 text-left font-bold text-sm text-white bg-gradient-to-br ${g.color} shadow-md hover:scale-105 active:scale-95 transition-all flex flex-col justify-between select-none cursor-pointer`}
                  >
                    <span className="truncate">{g.name}</span>
                    <span className="text-[10px] text-white/70 font-normal">Explore →</span>
                  </button>
                ))}
              </div>
            </div>

            {/* TRENDING IN REGION */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Flame size={18} className="text-orange-500 shrink-0" />
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Trending in {currentRegionName}</span>
                    <span>{currentRegion.flag}</span>
                  </h3>
                </div>

                {/* Quick Regional Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                  {FEATURED_REGIONS.map((r) => {
                    const isSelected = regionCode === r.code
                    return (
                      <button
                        key={r.code}
                        onClick={() => setRegionCode(r.code)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-md scale-105"
                            : "bg-zinc-900/90 text-gray-300 border border-white/10 hover:bg-zinc-800 hover:text-white"
                        }`}
                      >
                        <span>{r.flag}</span>
                        <span>{r.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {exploreLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="animate-spin text-primary mb-3" size={32} />
                  <p className="text-xs text-gray-400">Loading trending music in {currentRegionName}...</p>
                </div>
              ) : trendingVideos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {trendingVideos.slice(0, 8).map((video, idx) => (
                    <div
                      key={video.id}
                      onClick={() => handlePlayExploreTrack(video, trendingVideos, idx)}
                      className="group bg-zinc-900/60 border border-white/[0.06] hover:border-primary/30 rounded-2xl overflow-hidden p-3 cursor-pointer transition-all hover:bg-zinc-900"
                    >
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-800 mb-2.5">
                        <Image src={video.thumbnail} alt={video.title} fill className="object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                            <Play size={16} fill="currentColor" className="translate-x-0.5" />
                          </div>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-white truncate group-hover:text-primary transition-colors">{video.title}</p>
                      <p className="text-xs text-gray-400 truncate">{video.artist}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* DISCOVER MORE / FEATURED CONTENT */}
            <DiscoverMore onNavigate={onNavigate} />
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTS: COMPACT SONG ROW, ALBUM CARD, VIDEO CARD, ARTIST CARD
// ============================================================================

interface CompactSongRowProps {
  song: SearchResult
  index: number
  liked: boolean
  playlists: any[]
  onPlay: () => void
  onAddToQueue: () => void
  onToggleLike: () => void
  onAddToPlaylist: (playlistId: string) => void
  onOpenAlbum: (browseId: string) => void
  onBrowseArtist: (artist: string) => void
}

function CompactSongRow({
  song,
  index,
  liked,
  playlists,
  onPlay,
  onAddToQueue,
  onToggleLike,
  onAddToPlaylist,
  onOpenAlbum,
  onBrowseArtist,
}: CompactSongRowProps) {
  return (
    <div className="group flex items-center gap-3 md:gap-4 px-3 md:px-4 py-2.5 hover:bg-zinc-900/90 transition-all text-sm">
      {/* Thumbnail with Hover Play Button */}
      <div
        className="relative shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-lg overflow-hidden bg-zinc-800 cursor-pointer"
        onClick={onPlay}
      >
        {song.thumbnail ? (
          <Image src={song.thumbnail} alt={song.title} fill className="object-cover" sizes="48px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <Music2 size={20} />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform">
            <Play size={12} fill="currentColor" className="translate-x-0.5" />
          </div>
        </div>
      </div>

      {/* Song Title & Artist */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onPlay}>
        <p className="font-semibold text-white truncate group-hover:text-primary transition-colors text-sm">
          {song.title}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 truncate">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onBrowseArtist(song.artist)
            }}
            className="hover:text-white hover:underline truncate"
          >
            {song.artist}
          </button>
          {song.album && (
            <>
              <span className="text-gray-600">•</span>
              {song.albumEntity?.browseId ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenAlbum(song.albumEntity!.browseId!)
                  }}
                  className="hover:text-primary hover:underline truncate text-gray-400"
                >
                  {song.album}
                </button>
              ) : (
                <span className="truncate text-gray-400">{song.album}</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Duration */}
      <div className="hidden sm:block text-xs text-gray-400 font-mono pr-2 shrink-0">
        {song.duration || "--:--"}
      </div>

      {/* Like Heart Button */}
      <button
        type="button"
        onClick={onToggleLike}
        className={`p-1.5 rounded-full hover:bg-zinc-800 transition-colors shrink-0 ${
          liked ? "text-primary" : "text-gray-400 opacity-0 group-hover:opacity-100 hover:text-white"
        }`}
        aria-label="Like song"
      >
        <Heart size={16} fill={liked ? "currentColor" : "none"} />
      </button>

      {/* 3-dots Overflow Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
          >
            <MoreVertical size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white min-w-44">
          <DropdownMenuItem onClick={onPlay} className="gap-2 cursor-pointer text-xs hover:bg-primary/20 focus:bg-primary/20">
            <Play size={14} />
            Play Now
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAddToQueue} className="gap-2 cursor-pointer text-xs hover:bg-primary/20 focus:bg-primary/20">
            <ListPlus size={14} />
            Add to Queue
          </DropdownMenuItem>
          {song.albumEntity?.browseId && (
            <DropdownMenuItem
              onClick={() => onOpenAlbum(song.albumEntity!.browseId!)}
              className="gap-2 cursor-pointer text-xs hover:bg-primary/20 focus:bg-primary/20 text-primary font-medium"
            >
              <Disc3 size={14} />
              Go to Album
            </DropdownMenuItem>
          )}
          {playlists.length > 0 && (
            <>
              <DropdownMenuSeparator className="bg-white/10" />
              <div className="px-2 py-1 text-[10px] uppercase text-gray-400 font-semibold tracking-wider">
                Add to Playlist
              </div>
              {playlists.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => onAddToPlaylist(p.id)}
                  className="gap-2 cursor-pointer text-xs hover:bg-primary/20 focus:bg-primary/20"
                >
                  {p.name}
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function AlbumCard({
  album,
  onOpen,
  onBrowseArtist,
}: {
  album: SearchResult
  onOpen: () => void
  onBrowseArtist: (artist: string) => void
}) {
  return (
    <div
      onClick={onOpen}
      className="group bg-zinc-900/60 border border-white/[0.06] hover:border-primary/40 rounded-2xl p-3 cursor-pointer transition-all hover:bg-zinc-900/90 shadow-md"
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800 mb-2.5 shadow-lg">
        {album.thumbnail ? (
          <Image src={album.thumbnail} alt={album.title} fill className="object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <Disc3 size={32} />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
            <Play size={16} fill="currentColor" className="translate-x-0.5" />
          </div>
        </div>
      </div>
      <p className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
        {album.title}
      </p>
      <div className="flex items-center gap-1 text-xs text-gray-400 truncate">
        <span className="truncate">{album.artist}</span>
        {album.year && <span>• {album.year}</span>}
      </div>
    </div>
  )
}

function VideoCard({
  video,
  onPlay,
  onAddToQueue,
}: {
  video: SearchResult
  onPlay: () => void
  onAddToQueue: () => void
}) {
  return (
    <div
      onClick={onPlay}
      className="group bg-zinc-900/60 border border-white/[0.06] hover:border-primary/40 rounded-2xl p-3 cursor-pointer transition-all hover:bg-zinc-900/90 shadow-md"
    >
      <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-800 mb-2.5 shadow-lg">
        {video.thumbnail ? (
          <Image src={video.thumbnail} alt={video.title} fill className="object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <Video size={32} />
          </div>
        )}
        {video.duration && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
            {video.duration}
          </span>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
            <Play size={16} fill="currentColor" className="translate-x-0.5" />
          </div>
        </div>
      </div>
      <p className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
        {video.title}
      </p>
      <p className="text-xs text-gray-400 truncate">{video.channel || video.artist}</p>
    </div>
  )
}

function ArtistCard({
  artist,
  onOpen,
}: {
  artist: SearchResult
  onOpen: () => void
}) {
  return (
    <div
      onClick={onOpen}
      className="group bg-zinc-900/60 border border-white/[0.06] hover:border-primary/40 rounded-2xl p-4 cursor-pointer transition-all hover:bg-zinc-900/90 shadow-md text-center flex flex-col items-center"
    >
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-zinc-800 mb-3 shadow-lg ring-1 ring-white/10 group-hover:ring-primary/50 transition-all">
        {artist.thumbnail ? (
          <Image src={artist.thumbnail} alt={artist.title} fill className="object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <User size={36} />
          </div>
        )}
      </div>
      <p className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors w-full">
        {artist.title}
      </p>
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
        Artist
      </span>
    </div>
  )
}

function PlaylistCard({
  playlist,
  onBrowse,
}: {
  playlist: SearchResult
  onBrowse: () => void
}) {
  return (
    <div
      onClick={onBrowse}
      className="group bg-zinc-900/60 border border-white/[0.06] hover:border-primary/40 rounded-2xl p-3 cursor-pointer transition-all hover:bg-zinc-900/90 shadow-md"
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800 mb-2.5 shadow-lg">
        {playlist.thumbnail ? (
          <Image src={playlist.thumbnail} alt={playlist.title} fill className="object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <ListMusic size={32} />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
            <Play size={16} fill="currentColor" className="translate-x-0.5" />
          </div>
        </div>
      </div>
      <p className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
        {playlist.title}
      </p>
      <p className="text-xs text-gray-400 truncate">{playlist.artist || "Playlist"}</p>
    </div>
  )
}
