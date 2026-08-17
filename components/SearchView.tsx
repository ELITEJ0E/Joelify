"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  Search,
  Play,
  Plus,
  ExternalLink,
  Loader2,
  Heart,
  Compass,
  Music2,
  Disc3,
  User,
  ListMusic,
  Menu,
  ChevronDown,
  ArrowLeft,
  MoreVertical,
} from "lucide-react"
import { TrackImage as Image } from "./TrackImage"
import type { SearchResult } from "@/lib/music/types"
import { useApp } from "@/contexts/AppContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DiscoverMore } from "./DiscoverMore"
import { getCachedData, setCachedData } from "@/lib/cache"

const loadingMessages = [
  "Joelifying...",
  "Applying autotune...",
  "Buffering bangers...",
  "Searching the soundwaves...",
  "Finding your jam...",
  "Tuning in...",
  "Still buffering... blame the Wi-Fi...",
  "Joelify is currently vibing...",
]

interface CachedSearch {
  results: SearchResult[]
  continuation: string | null
}

interface VideoItem {
  id: string
  title: string
  artist: string
  thumbnail: string
  viewCount?: string
}

const REGIONS = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "ID", name: "Indonesia" },
  { code: "KR", name: "South Korea" },
  { code: "JP", name: "Japan" },
  { code: "BR", name: "Brazil" },
]

const GENRES = [
  { name: "Pop", color: "from-blue-600 to-indigo-900" },
  { name: "Hip-Hop", color: "from-amber-600 to-red-900" },
  { name: "K-Pop", color: "from-pink-600 to-purple-900" },
  { name: "Rock", color: "from-red-600 to-zinc-900" },
  { name: "R&B", color: "from-purple-600 to-indigo-900" },
  { name: "EDM", color: "from-emerald-600 to-teal-900" },
  { name: "Latin", color: "from-orange-600 to-amber-900" },
  { name: "Indie", color: "from-teal-600 to-slate-900" },
]

function toTrack(result: SearchResult) {
  return {
    id: result.videoId ?? result.id,
    title: result.title,
    artist: result.artist,
    thumbnail: result.thumbnail,
    duration: result.duration,
  }
}

interface SearchViewProps {
  onNavigate?: (view: any) => void
  onOpenSidebar?: () => void
}

export function SearchView({ onNavigate, onOpenSidebar }: SearchViewProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
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
  const [regionCode, setRegionCode] = useState("US")
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

  // Debounced search suggestions with request cancellation
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
    if (!showSuggestions || suggestions.length === 0) {
      return
    }

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
    setLoadingMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)])

    searchAbortRef.current?.abort()
    const controller = new AbortController()
    searchAbortRef.current = controller

    try {
      const cacheKey = `musicSearchCache_${searchQuery.toLowerCase()}`
      const cached = getCachedData<CachedSearch>(cacheKey, sessionStorage)

      if (cached) {
        setResults(cached.results)
        setContinuation(cached.continuation)
      } else {
        const res = await fetch(`/api/music/search?q=${encodeURIComponent(searchQuery)}`, { signal: controller.signal })
        const data = await res.json()
        if (controller.signal.aborted) return

        if (data.error && (!data.results || data.results.length === 0)) {
          setError(data.error)
          setResults([])
          setContinuation(null)
        } else {
          setResults(data.results)
          setContinuation(data.continuation ?? null)
          setCachedData(cacheKey, { results: data.results, continuation: data.continuation ?? null }, sessionStorage)
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

  const handleLoadMore = async () => {
    if (!continuation || isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const res = await fetch(`/api/music/continuation?token=${encodeURIComponent(continuation)}`)
      const data = await res.json()
      if (data.results?.length > 0) {
        setResults((prev) => {
          const seen = new Set(prev.map((r) => r.videoId ?? r.id))
          const merged = [...prev, ...data.results.filter((r: SearchResult) => !seen.has(r.videoId ?? r.id))]
          return merged
        })
      }
      setContinuation(data.continuation ?? null)
    } catch (err) {
      console.error("[SearchView] Load more failed:", err)
      setContinuation(null)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handlePlayNow = (result: SearchResult) => {
    setPlaybackSource("youtube")
    setCurrentTrack(toTrack(result) as any)
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
    setQueue(remaining)
  }

  const handleAddToQueue = (result: SearchResult) => {
    addToQueue(toTrack(result) as any)
  }

  const handleBrowseResult = (result: SearchResult) => {
    const nextQuery = result.type === "artist" ? result.title : `${result.artist} ${result.title}`.trim()
    setQuery(nextQuery)
    runSearch(nextQuery)
  }

  const playable = results.filter((r) => r.type === "song" || r.type === "video")
  const artists = results.filter((r) => r.type === "artist")
  const albums = results.filter((r) => r.type === "album")
  const playlistResults = results.filter((r) => r.type === "playlist")

  const currentRegionName = REGIONS.find((r) => r.code === regionCode)?.name || "United States"

  return (
    <div className="flex-1 bg-gradient-to-b from-[hsl(var(--primary)/0.06)] to-transparent text-foreground p-4 md:p-8 overflow-y-auto pb-28">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* HEADER: SEARCH INPUT */}
        <div className="pt-2">

          <form onSubmit={handleSearch} className="flex-1 relative" ref={searchBoxRef}>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={18} />
            <Input
              type="text"
              placeholder="Songs, albums or artists..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedIndex(-1)
              }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onKeyDown={handleInputKeyDown}
              className="pl-10 pr-10 h-11 rounded-xl bg-zinc-900/90 border-white/10 text-white placeholder:text-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
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

          {/* Region Selector Pill */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="rounded-full border-white/20 bg-zinc-900/80 text-white text-xs font-medium hover:bg-zinc-800 flex items-center gap-1.5 h-11 px-3 shrink-0"
              >
                {regionCode}
                <ChevronDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white">
              {REGIONS.map((r) => (
                <DropdownMenuItem
                  key={r.code}
                  onClick={() => setRegionCode(r.code)}
                  className="hover:bg-primary/20 focus:bg-primary/20 cursor-pointer text-xs"
                >
                  {r.name} ({r.code})
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* LOADING STATE FOR SEARCH */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="animate-spin text-primary mb-4" size={40} />
            <p className="text-sm text-gray-400">{loadingMessage}</p>
          </div>
        )}

        {/* ERROR STATE FOR SEARCH */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6">
            <p className="text-destructive font-semibold mb-1">Search Error</p>
            <p className="text-xs text-gray-400 mb-3">{error}</p>
            <Button onClick={() => runSearch(lastQuery || query)} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        )}

        {/* ACTIVE SEARCH RESULTS GRID */}
        {!isLoading && results.length > 0 && (
          <div className="mb-8">
            {lastQuery && <p className="text-xs text-gray-400 mb-4">Showing results for "{lastQuery}"</p>}

            {(artists.length > 0 || albums.length > 0 || playlistResults.length > 0) && (
              <div className="mb-8 space-y-6">
                {artists.length > 0 && (
                  <BrowseRow title="Artists" icon={<User size={18} />} items={artists.slice(0, 6)} rounded onBrowse={handleBrowseResult} />
                )}
                {albums.length > 0 && (
                  <BrowseRow title="Albums" icon={<Disc3 size={18} />} items={albums.slice(0, 6)} onBrowse={handleBrowseResult} />
                )}
                {playlistResults.length > 0 && (
                  <BrowseRow title="Playlists" icon={<ListMusic size={18} />} items={playlistResults.slice(0, 6)} onBrowse={handleBrowseResult} />
                )}
              </div>
            )}

            {playable.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Music2 size={18} className="text-primary" />
                  <h2 className="text-lg font-bold text-white">Songs</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {playable.map((result) => (
                    <SearchResultCard
                      key={result.id}
                      result={result}
                      playlists={playlists}
                      onPlayNow={handlePlayNow}
                      onAddToQueue={handleAddToQueue}
                      onAddToPlaylist={addTrackToPlaylist}
                      onToggleLike={toggleLikedSong}
                      isLiked={isTrackLiked(result.videoId ?? result.id)}
                    />
                  ))}
                </div>
              </>
            )}

            {continuation && (
              <div className="flex justify-center mt-8">
                <Button onClick={handleLoadMore} disabled={isLoadingMore} variant="secondary" size="lg" className="rounded-full px-8">
                  {isLoadingMore ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                  {isLoadingMore ? "Loading..." : "Load more results"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* DEFAULT EXPLORE VIEW CONTENT (When query/results are empty) */}
        {!isLoading && results.length === 0 && (
          <div className="space-y-6">
            {/* IF A GENRE IS SELECTED */}
            {selectedGenre ? (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setSelectedGenre(null)}
                    className="text-primary hover:bg-primary/10 rounded-full"
                  >
                    <ArrowLeft size={20} />
                  </Button>
                  <h2 className="text-2xl font-bold text-primary">{selectedGenre} Songs</h2>
                </div>

                {genreLoading ? (
                  <div className="space-y-3 py-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-2 bg-white/[0.02] rounded-xl animate-pulse">
                        <div className="w-14 h-14 bg-secondary/60 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-secondary/60 rounded w-1/2" />
                          <div className="h-3 bg-secondary/40 rounded w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {genreVideos.map((video, idx) => (
                      <div
                        key={video.id}
                        onClick={() => handlePlayExploreTrack(video, genreVideos, idx)}
                        className="group flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.08] transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-secondary">
                            <Image src={video.thumbnail || "/placeholder.svg"} alt={video.title} fill className="object-cover" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm text-white line-clamp-1 group-hover:text-primary transition-colors">
                              {idx + 1}. {video.title}
                            </h3>
                            <p className="text-xs text-gray-400 line-clamp-1">{video.artist}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* HERO FEATURE CAROUSEL */}
                {!exploreLoading && heroVideos.length > 0 && (
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                    {heroVideos.map((item, idx) => (
                      <div
                        key={item.id}
                        onClick={() => handlePlayExploreTrack(item, heroVideos, idx)}
                        className="flex-shrink-0 w-72 md:w-80 group cursor-pointer"
                      >
                        <div className="relative aspect-video rounded-2xl overflow-hidden bg-secondary shadow-lg border border-white/10 mb-2">
                          <Image
                            src={item.thumbnail || "/placeholder.svg"}
                            alt={item.title}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button size="icon" className="bg-primary text-black rounded-full h-12 w-12 shadow-lg">
                              <Play fill="currentColor" size={20} className="ml-0.5" />
                            </Button>
                          </div>
                        </div>
                        <h3 className="font-semibold text-sm text-white line-clamp-1 group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-xs text-gray-400 line-clamp-1">{item.artist}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* VIDEO CHARTS CARDS */}
                <section className="space-y-3">
                  <h2 className="text-xl font-bold text-primary tracking-tight">Video charts</h2>

                  <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                    {/* Card 1: Trending Top 20 */}
                    <div
                      onClick={() => onNavigate?.("charts")}
                      className="flex-shrink-0 w-44 md:w-48 bg-gradient-to-br from-red-600/80 to-zinc-900 border border-white/10 rounded-2xl p-4 flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform shadow-lg"
                    >
                      <div>
                        <span className="text-[10px] font-bold tracking-wider uppercase text-red-200">TRENDING</span>
                        <h3 className="text-2xl font-black text-white mt-1">TOP 20</h3>
                      </div>
                      <div className="mt-6">
                        <p className="text-xs font-semibold text-white">Trending {currentRegionName}</p>
                        <p className="text-[10px] text-gray-300">Chart • YouTube Music</p>
                      </div>
                    </div>

                    {/* Card 2: Live Performances */}
                    <div
                      onClick={() => handleSelectGenre("Live Performance")}
                      className="flex-shrink-0 w-44 md:w-48 bg-gradient-to-br from-zinc-800 to-black border border-white/10 rounded-2xl p-4 flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform shadow-lg"
                    >
                      <div>
                        <span className="text-[10px] font-bold tracking-wider uppercase text-gray-400">WEEKLY</span>
                        <h3 className="text-xl font-black text-white mt-1">TOP 100</h3>
                        <p className="text-xs text-red-400 font-semibold">LIVE SHOWS</p>
                      </div>
                      <div className="mt-6">
                        <p className="text-xs font-semibold text-white">Top Live Shows</p>
                        <p className="text-[10px] text-gray-400">Chart • YouTube Music</p>
                      </div>
                    </div>

                    {/* Card 3: Top Hits */}
                    <div
                      onClick={() => handleSelectGenre("Top Hits")}
                      className="flex-shrink-0 w-44 md:w-48 bg-gradient-to-br from-emerald-600/80 to-zinc-900 border border-white/10 rounded-2xl p-4 flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform shadow-lg"
                    >
                      <div>
                        <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-200">DAILY</span>
                        <h3 className="text-2xl font-black text-white mt-1">TOP HITS</h3>
                      </div>
                      <div className="mt-6">
                        <p className="text-xs font-semibold text-white">Daily Top Hits</p>
                        <p className="text-[10px] text-gray-300">Chart • YouTube Music</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* GENRES GRID */}
                <section className="space-y-3">
                  <h2 className="text-xl font-bold text-primary tracking-tight">Genres</h2>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {GENRES.map((g) => (
                      <div
                        key={g.name}
                        onClick={() => handleSelectGenre(g.name)}
                        className={`bg-gradient-to-br ${g.color} border border-white/10 rounded-2xl p-4 h-28 flex flex-col justify-between cursor-pointer hover:scale-[1.03] transition-transform shadow-lg relative overflow-hidden group`}
                      >
                        <span className="text-xs font-bold uppercase tracking-wider text-white/70">TOP 50</span>
                        <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                          {g.name}
                        </h3>
                      </div>
                    ))}
                  </div>
                </section>

                {/* DISCOVER MORE */}
                <section className="pt-4">
                  <div className="flex items-center gap-3 mb-6">
                    <Compass size={24} className="text-primary" />
                    <h2 className="text-xl font-bold text-white">Discover More</h2>
                  </div>
                  <DiscoverMore />
                </section>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function BrowseRow({
  title,
  icon,
  items,
  rounded,
  onBrowse,
}: {
  title: string
  icon: React.ReactNode
  items: SearchResult[]
  rounded?: boolean
  onBrowse: (result: SearchResult) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 text-primary">
        {icon}
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onBrowse(item)}
            className="flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.07] rounded-xl p-3 pr-5 transition-all shrink-0 text-left group"
            title={`Search for ${item.title}`}
          >
            <div className={`relative w-12 h-12 overflow-hidden shrink-0 ${rounded ? "rounded-full" : "rounded-md"}`}>
              <Image src={item.thumbnail || "/placeholder.svg"} alt={item.title} fill className="object-cover" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">{item.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {item.type === "artist" ? "Artist" : item.artist || (item.type === "album" ? "Album" : "Playlist")}
                {item.year ? ` • ${item.year}` : ""}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function SearchResultCard({
  result,
  playlists,
  onPlayNow,
  onAddToQueue,
  onAddToPlaylist,
  onToggleLike,
  isLiked,
}: {
  result: SearchResult
  playlists: any[]
  onPlayNow: (result: SearchResult) => void
  onAddToQueue: (result: SearchResult) => void
  onAddToPlaylist: (playlistId: string, track: any) => void
  onToggleLike: (track: any) => void
  isLiked: boolean
}) {
  const [selectedPlaylist, setSelectedPlaylist] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)

  const handleAddToPlaylist = () => {
    if (!selectedPlaylist) return
    onAddToPlaylist(selectedPlaylist, toTrack(result))
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 2000)
  }

  const videoId = result.videoId ?? result.id
  const externalUrl = `https://www.youtube.com/watch?v=${videoId}`

  return (
    <div className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] backdrop-blur-xl rounded-xl p-4 transition-all duration-300 group hover:scale-[1.02] hover:shadow-xl hover:shadow-black/40">
      <div className="relative mb-4 aspect-square rounded-lg overflow-hidden shadow-lg">
        <Image src={result.thumbnail || "/placeholder.svg"} alt={result.title} fill className="object-cover" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-3">
          <Button
            size="icon"
            className="bg-primary hover:bg-primary/90 hover:scale-105 text-white rounded-full h-12 w-12 shadow-lg shadow-primary/20 translate-y-4 group-hover:translate-y-0 transition-all duration-300 opacity-0 group-hover:opacity-100"
            onClick={() => onPlayNow(result)}
          >
            <Play fill="currentColor" size={20} className="ml-1" />
          </Button>
        </div>
        {result.duration && (
          <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
            {result.duration}
          </div>
        )}
      </div>

      <h3 className="font-semibold text-sm line-clamp-2 mb-1">{result.title}</h3>
      <p className="text-xs text-muted-foreground line-clamp-1">{result.artist}</p>
      {result.album && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{result.album}</p>}

      <div className="flex gap-2 mt-3">
        <Button size="sm" variant="secondary" className="flex-1 text-xs h-8" onClick={() => onAddToQueue(result)}>
          <Plus size={14} className="mr-1" /> Queue
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className={`h-8 w-8 ${isLiked ? "text-primary" : ""}`}
          onClick={() => onToggleLike(toTrack(result))}
        >
          <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
        </Button>
        <Button size="icon" variant="secondary" className="h-8 w-8" asChild>
          <a href={externalUrl} target="_blank" rel="noopener noreferrer" aria-label="Open on YouTube">
            <ExternalLink size={14} />
          </a>
        </Button>
      </div>

      <div className="flex gap-2 mt-2">
        <Select value={selectedPlaylist} onValueChange={setSelectedPlaylist}>
          <SelectTrigger className="flex-1 h-8 text-xs">
            <SelectValue placeholder="Add to playlist..." />
          </SelectTrigger>
          <SelectContent>
            {playlists.map((playlist: any) => (
              <SelectItem key={playlist.id} value={playlist.id} className="text-xs">
                {playlist.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="secondary"
          className="h-8 px-3 text-xs"
          onClick={handleAddToPlaylist}
          disabled={!selectedPlaylist}
        >
          Add
        </Button>
      </div>

      {showSuccess && <p className="text-xs text-primary text-center animate-in fade-in mt-2">Added to playlist!</p>}
    </div>
  )
}
