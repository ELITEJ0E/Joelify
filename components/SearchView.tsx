"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Search, Play, Plus, ExternalLink, Loader2, Heart, Compass, Music2, Disc3, User, ListMusic } from 'lucide-react'
import { TrackImage as Image } from "./TrackImage"
import type { SearchResult } from "@/lib/music/types"
import { useApp } from "@/contexts/AppContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

function toTrack(result: SearchResult) {
  return {
    id: result.videoId ?? result.id,
    title: result.title,
    artist: result.artist,
    thumbnail: result.thumbnail,
    duration: result.duration,
  }
}

export function SearchView() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [continuation, setContinuation] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0])
  const [lastQuery, setLastQuery] = useState("")

  const searchAbortRef = useRef<AbortController | null>(null)
  const suggestAbortRef = useRef<AbortController | null>(null)
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchBoxRef = useRef<HTMLDivElement>(null)

  const {
    playlists,
    addTrackToPlaylist,
    setCurrentTrack,
    addToQueue,
    toggleLikedSong,
    isTrackLiked,
    setPlaybackSource,
  } = useApp()

  // Debounced search suggestions with request cancellation
  useEffect(() => {
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)
    const q = query.trim()
    if (q.length < 2 || q === lastQuery) {
      setSuggestions([])
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
        }
      } catch {
        // aborted or offline - ignore, suggestions are best-effort
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
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  const runSearch = useCallback(async (rawQuery: string) => {
    const trimmed = rawQuery.trim()
    if (!trimmed) return

    // Direct YouTube URL support
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

    // Cancel any in-flight search
    searchAbortRef.current?.abort()
    const controller = new AbortController()
    searchAbortRef.current = controller

    try {
      const cacheKey = `musicSearchCache_${searchQuery.toLowerCase()}`
      const cached = getCachedData<CachedSearch>(cacheKey, sessionStorage)

      if (cached) {
        console.log(`[v0] Using cached search results for "${searchQuery}"`)
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
      console.error("[v0] Search failed:", err)
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
      console.error("[v0] Load more failed:", err)
      setContinuation(null)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handlePlayNow = (result: SearchResult) => {
    setPlaybackSource("youtube")
    setCurrentTrack(toTrack(result) as any)
  }

  const handleAddToQueue = (result: SearchResult) => {
    addToQueue(toTrack(result) as any)
  }

  const handleBrowseResult = (result: SearchResult) => {
    // Albums / artists / playlists re-search so results stay inside Joelify
    const nextQuery = result.type === "artist" ? result.title : `${result.artist} ${result.title}`.trim()
    setQuery(nextQuery)
    runSearch(nextQuery)
  }

  const playable = results.filter((r) => r.type === "song" || r.type === "video")
  const artists = results.filter((r) => r.type === "artist")
  const albums = results.filter((r) => r.type === "album")
  const playlistResults = results.filter((r) => r.type === "playlist")

  return (
    <div className="flex-1 bg-gradient-to-b from-[hsl(var(--primary)/0.06)] to-transparent text-foreground p-4 md:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 md:mb-8">Search</h1>

        <form onSubmit={handleSearch} className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <div className="flex-1 relative" ref={searchBoxRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" size={20} />
              <Input
                type="text"
                placeholder="Search for songs, artists, albums, or playlists..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                className="pl-10 h-14 rounded-full bg-secondary/50 border-none text-base ring-1 ring-primary/20 focus-visible:ring-primary/60 transition-all shadow-inner"
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-secondary/60 transition-colors"
                      onClick={() => handleSuggestionClick(s)}
                    >
                      <Search size={14} className="text-muted-foreground shrink-0" />
                      <span className="line-clamp-1">{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" size="lg" disabled={isLoading} className="bg-primary hover:bg-primary/90 h-14 rounded-full px-8 shadow-lg shadow-primary/20 hover:scale-105 transition-all">
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Search"}
            </Button>
          </div>
        </form>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary mb-4" size={48} />
            <p className="text-lg text-muted-foreground">{loadingMessage}</p>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-8">
            <p className="text-destructive font-semibold mb-2">Oops! Something went wrong</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => runSearch(lastQuery || query)} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="mb-12">
            {lastQuery && <p className="text-sm text-muted-foreground mb-4">Showing results for "{lastQuery}"</p>}

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
                  <h2 className="text-lg font-bold">Songs</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
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

        {!isLoading && !error && results.length === 0 && query && (
          <div className="text-center py-20">
            <p className="text-lg md:text-xl text-muted-foreground">Looking for "{query}"?</p>
            <p className="text-sm text-muted-foreground mt-2">Enter to search</p>
          </div>
        )}

        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Compass size={28} className="text-primary" />
            <h2 className="text-4xl font-bold tracking-tight text-white">Discover More</h2>
          </div>
          <DiscoverMore />
        </section>
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
      <div className="flex gap-3 overflow-x-auto pb-2">
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
      <div className="relative mb-4 aspect-video rounded-lg overflow-hidden shadow-lg">
        <Image src={result.thumbnail || "/placeholder.svg"} alt={result.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
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
