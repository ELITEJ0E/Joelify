"use client"

import type React from "react"
import { useState } from "react"
import { Search, Plus, ExternalLink, Loader2, Heart, Compass, Play } from 'lucide-react'
import Image from "next/image"
import type { YouTubeVideo } from "@/lib/youtube"
import { useApp } from "@/contexts/AppContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DiscoverMore } from "./DiscoverMore"
import { getCachedData, setCachedData } from "@/lib/cache"
import { searchTracks } from "@/lib/spotifyApi"
import { isAuthenticated } from "@/lib/spotifyAuth"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

export function SearchView() {
  const [query, setQuery] = useState("")
  const [youtubeResults, setYoutubeResults] = useState<YouTubeVideo[]>([])
  const [spotifyResults, setSpotifyResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0])
  const [searchSource, setSearchSource] = useState<"youtube" | "spotify" | "both">("both")
  const [lastQuery, setLastQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"youtube" | "spotify">("youtube")

  const {
    playlists,
    addTrackToPlaylist,
    setCurrentTrack,
    addToQueue,
    toggleLikedSong,
    isTrackLiked,
    playbackSource,
    setPlaybackSource,
  } = useApp()

  const isSpotifyAuth = isAuthenticated()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLastQuery(query)
    setIsLoading(true)
    setError(null)
    setLoadingMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)])

    try {
      if (searchSource === "youtube" || searchSource === "both") {
        const cacheKey = `searchCache_${query.trim().toLowerCase()}`
        const cached = getCachedData<YouTubeVideo[]>(cacheKey, sessionStorage)

        if (cached) {
          console.log(`[v0] Using cached YouTube search results for "${query}"`)
          setYoutubeResults(cached)
          if (cached.length > 0) setActiveTab("youtube")
        } else {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
          const data = await res.json()

          if (data.error) {
            console.error("[v0] YouTube API error:", data.error)
            setError(data.error)
          } else {
            setCachedData(cacheKey, data.items, sessionStorage)
            setYoutubeResults(data.items)
            if (data.items.length > 0) setActiveTab("youtube")
          }
        }
      }

      if ((searchSource === "spotify" || searchSource === "both") && isSpotifyAuth) {
        const cacheKey = `spotifySearchCache_${query.trim().toLowerCase()}`
        const cached = getCachedData<any[]>(cacheKey, sessionStorage)

        if (cached) {
          console.log(`[Spotify] Using cached search results for "${query}"`)
          setSpotifyResults(cached)
          if (cached.length > 0 && youtubeResults.length === 0) setActiveTab("spotify")
        } else {
          const data = await searchTracks(query, 20)
          const tracks = data.tracks.items.map((track: any) => ({
            id: track.id,
            title: track.name,
            artist: track.artists.map((a: any) => a.name).join(", "),
            thumbnail: track.album.images[0]?.url || "",
            duration: `${Math.floor(track.duration_ms / 60000)}:${String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, "0")}`,
            uri: track.uri,
            spotifyUrl: track.external_urls.spotify,
          }))
          setCachedData(cacheKey, tracks, sessionStorage)
          setSpotifyResults(tracks)
          if (tracks.length > 0 && youtubeResults.length === 0) setActiveTab("spotify")
        }
      }

      setIsLoading(false)
    } catch (err) {
      console.error("[v0] Search failed:", err)
      setIsLoading(false)
      setError("Failed to fetch search results.")
    }
  }

  const handlePlayNow = (video: YouTubeVideo | any, source: "youtube" | "spotify") => {
    setPlaybackSource(source)
    setCurrentTrack(video)
  }

  const handleAddToQueue = (video: YouTubeVideo | any) => {
    addToQueue(video)
  }

  return (
    // Changed gradient to use theme primary color with opacity
    <div className="flex-1 bg-gradient-to-b from-primary/10 to-background text-foreground p-4 md:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 md:mb-8">Search</h1>

        <form onSubmit={handleSearch} className="mb-6 md:mb-8">
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <Input
                  type="text"
                  placeholder="Search for songs, artists, or albums..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10 h-14 rounded-full bg-secondary/50 border-none text-base ring-1 ring-primary/20 focus-visible:ring-primary/60 transition-all shadow-inner"
                />
              </div>
              <Button type="submit" size="lg" disabled={isLoading} className="bg-primary hover:bg-primary/90 h-14 rounded-full px-8 shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Search"}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Search in:</span>
              <Select value={searchSource} onValueChange={(value: any) => setSearchSource(value)}>
                <SelectTrigger className="w-40 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="spotify" disabled={!isSpotifyAuth}>
                    Spotify {!isSpotifyAuth && "(Login required)"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <Button onClick={(e) => handleSearch(e)} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        )}

        {!isLoading && (youtubeResults.length > 0 || spotifyResults.length > 0) && (
          <div className="mb-12">
            {lastQuery && <p className="text-sm text-muted-foreground mb-4">Showing results for "{lastQuery}"</p>}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "youtube" | "spotify")} className="w-full">
              <TabsList className="mb-6">
                {youtubeResults.length > 0 && (
                  <TabsTrigger value="youtube">YouTube ({youtubeResults.length})</TabsTrigger>
                )}
                {spotifyResults.length > 0 && (
                  <TabsTrigger value="spotify">Spotify ({spotifyResults.length})</TabsTrigger>
                )}
              </TabsList>

              {youtubeResults.length > 0 && (
                <TabsContent value="youtube">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {youtubeResults.map((video) => (
                      <SearchResultCard
                        key={video.id}
                        video={video}
                        source="youtube"
                        playlists={playlists}
                        onPlayNow={handlePlayNow}
                        onAddToQueue={handleAddToQueue}
                        onAddToPlaylist={addTrackToPlaylist}
                        onToggleLike={toggleLikedSong}
                        isLiked={isTrackLiked(video.id)}
                      />
                    ))}
                  </div>
                </TabsContent>
              )}

              {spotifyResults.length > 0 && (
                <TabsContent value="spotify">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {spotifyResults.map((track) => (
                      <SearchResultCard
                        key={track.id}
                        video={track}
                        source="spotify"
                        playlists={playlists}
                        onPlayNow={handlePlayNow}
                        onAddToQueue={handleAddToQueue}
                        onAddToPlaylist={addTrackToPlaylist}
                        onToggleLike={toggleLikedSong}
                        isLiked={isTrackLiked(track.id)}
                      />
                    ))}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}

        {!isLoading && !error && youtubeResults.length === 0 && spotifyResults.length === 0 && query && (
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

function SearchResultCard({
  video,
  source,
  playlists,
  onPlayNow,
  onAddToQueue,
  onAddToPlaylist,
  onToggleLike,
  isLiked,
}: any) {
  const [selectedPlaylist, setSelectedPlaylist] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)

  const handleAddToPlaylist = () => {
    if (!selectedPlaylist) return
    onAddToPlaylist(selectedPlaylist, video)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 2000)
  }

  const externalUrl = source === "spotify" ? video.spotifyUrl : `https://www.youtube.com/watch?v=${video.id}`

  return (
    <div className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] backdrop-blur-xl rounded-xl p-4 transition-all duration-300 group hover:scale-[1.02] hover:shadow-xl hover:shadow-black/40">
      <div className="relative mb-4 aspect-video rounded-lg overflow-hidden shadow-lg">
        <Image src={video.thumbnail || "/placeholder.svg"} alt={video.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-3">
          <Button
            size="icon"
            className="bg-primary hover:bg-primary/90 hover:scale-105 text-white rounded-full h-12 w-12 shadow-lg shadow-primary/20 translate-y-4 group-hover:translate-y-0 transition-all duration-300 opacity-0 group-hover:opacity-100"
            onClick={() => onPlayNow(video, source)}
          >
            <Play fill="currentColor" size={20} className="ml-1" />
          </Button>
        </div>
        <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
          {source === "spotify" ? "Spotify" : "YouTube"}
        </div>
      </div>

      <h3 className="font-semibold text-sm line-clamp-2 mb-1">{video.title}</h3>
      <p className="text-xs text-muted-foreground line-clamp-1">{video.artist}</p>
      <p className="text-xs text-muted-foreground mt-1">{video.duration}</p>

      <div className="flex gap-2 mt-3">
        <Button size="sm" variant="secondary" className="flex-1 text-xs h-8" onClick={() => onAddToQueue(video)}>
          <Plus size={14} className="mr-1" /> Queue
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className={`h-8 w-8 ${isLiked ? "text-primary" : ""}`}
          onClick={() => onToggleLike(video)}
        >
          <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
        </Button>
        <Button size="icon" variant="secondary" className="h-8 w-8" asChild>
          <a href={externalUrl} target="_blank" rel="noopener noreferrer">
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