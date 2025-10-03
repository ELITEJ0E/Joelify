"use client"

import type React from "react"

import { useState } from "react"
import { Search, Plus, ExternalLink, Loader2, Heart } from "lucide-react"
import Image from "next/image"
import { searchYouTube, type YouTubeVideo } from "@/lib/youtube"
import { useApp } from "@/contexts/AppContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const loadingMessages = [
  "Fetching vibes...",
  "Buffering bangers...",
  "Searching the soundwaves...",
  "Finding your jam...",
  "Tuning in...",
]

export function SearchView() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<YouTubeVideo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0])
  const { playlists, addTrackToPlaylist, setCurrentTrack, addToQueue, toggleLikedSong, isTrackLiked } = useApp()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)
    setLoadingMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)])

    const { items, error: searchError } = await searchYouTube(query)

    setIsLoading(false)

    if (searchError) {
      setError(searchError)
    } else {
      setResults(items)
    }
  }

  const handlePlayNow = (video: YouTubeVideo) => {
    setCurrentTrack({
      id: video.id,
      title: video.title,
      artist: video.artist,
      thumbnail: video.thumbnail,
      duration: video.duration,
    })
  }

  const handleAddToQueue = (video: YouTubeVideo) => {
    addToQueue({
      id: video.id,
      title: video.title,
      artist: video.artist,
      thumbnail: video.thumbnail,
      duration: video.duration,
    })
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-green-900/20 to-background text-foreground p-4 md:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 md:mb-8">Search</h1>

        <form onSubmit={handleSearch} className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                type="text"
                placeholder="Search for songs, artists, or albums..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-12 bg-secondary/50 border-none text-base"
                aria-label="Search for music"
              />
            </div>
            <Button type="submit" size="lg" disabled={isLoading} className="bg-primary hover:bg-primary/90 h-12">
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
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 md:p-6 mb-6 md:mb-8">
            <p className="text-destructive font-semibold mb-2">Oops! Something went wrong</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => handleSearch({ preventDefault: () => {} } as React.FormEvent)} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Results</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {results.map((video) => (
                <SearchResultCard
                  key={video.id}
                  video={video}
                  playlists={playlists}
                  onPlayNow={handlePlayNow}
                  onAddToQueue={handleAddToQueue}
                  onAddToPlaylist={addTrackToPlaylist}
                  onToggleLike={toggleLikedSong}
                  isLiked={isTrackLiked(video.id)}
                />
              ))}
            </div>
          </div>
        )}

        {!isLoading && !error && results.length === 0 && query && (
          <div className="text-center py-20">
            <p className="text-lg md:text-xl text-muted-foreground">No results found for "{query}"</p>
            <p className="text-sm text-muted-foreground mt-2">Try searching with different keywords</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface SearchResultCardProps {
  video: YouTubeVideo
  playlists: any[]
  onPlayNow: (video: YouTubeVideo) => void
  onAddToQueue: (video: YouTubeVideo) => void
  onAddToPlaylist: (playlistId: string, track: any) => void
  onToggleLike: (track: any) => void
  isLiked: boolean
}

function SearchResultCard({ video, playlists, onPlayNow, onAddToQueue, onAddToPlaylist, onToggleLike, isLiked }: SearchResultCardProps) {
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>("")
  const [showSuccess, setShowSuccess] = useState(false)

  const handleAddToPlaylist = () => {
    if (!selectedPlaylist) return

    onAddToPlaylist(selectedPlaylist, {
      id: video.id,
      title: video.title,
      artist: video.artist,
      thumbnail: video.thumbnail,
      duration: video.duration,
    })

    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 2000)
  }

  const handleToggleLike = () => {
    onToggleLike({
      id: video.id,
      title: video.title,
      artist: video.artist,
      thumbnail: video.thumbnail,
      duration: video.duration,
    })
  }

  return (
    <div
      className="bg-card hover:bg-card/80 rounded-lg p-4 transition-all group"
      role="article"
      aria-label={`${video.title} by ${video.artist}`}
    >
      <div className="relative mb-4 aspect-video rounded-md overflow-hidden">
        <Image src={video.thumbnail || "/placeholder.svg"} alt={video.title} fill className="object-cover" />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button
            size="icon"
            className="bg-primary hover:bg-primary/90 rounded-full h-12 w-12"
            onClick={() => onPlayNow(video)}
            aria-label={`Play ${video.title}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </Button>
        </div>
      </div>

      <div className="mb-3">
        <h3 className="font-semibold text-sm line-clamp-2 mb-1" title={video.title}>
          {video.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-1" title={video.artist}>
          {video.artist}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{video.duration}</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1 text-xs h-8"
            onClick={() => onAddToQueue(video)}
            aria-label="Add to queue"
          >
            <Plus size={14} className="mr-1" />
            Queue
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className={`h-8 w-8 ${isLiked ? "text-primary" : ""}`}
            onClick={handleToggleLike}
            aria-label={isLiked ? "Unlike song" : "Like song"}
          >
            <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            asChild
          >
            <a
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open in YouTube"
            >
              <ExternalLink size={14} />
            </a>
          </Button>
        </div>

        <div className="flex gap-2">
          <Select value={selectedPlaylist} onValueChange={setSelectedPlaylist}>
            <SelectTrigger className="flex-1 h-8 text-xs">
              <SelectValue placeholder="Add to playlist..." />
            </SelectTrigger>
            <SelectContent>
              {playlists.map((playlist) => (
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

        {showSuccess && (
          <p className="text-xs text-primary text-center animate-in fade-in duration-200">
            Added to playlist!
          </p>
        )}
      </div>
    </div>
  )
}
