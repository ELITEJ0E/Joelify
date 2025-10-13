"use client"

import { useState, useEffect } from "react"
import { useApp } from "@/contexts/AppContext"
import { Play, Plus } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface DiscoverVideo {
  id: string
  title: string
  artist: string
  thumbnail: string
}

export function DiscoverMore() {
  const { currentTrack, setCurrentTrack, setQueue, addToQueue, playlists, addTrackToPlaylist } = useApp()
  const [videos, setVideos] = useState<DiscoverVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRecommendations()
  }, [currentTrack])

  const fetchRecommendations = async () => {
    setLoading(true)
    setError(null)

    try {
      let url = `/api/discover`
      if (currentTrack) {
        const params = new URLSearchParams({
          videoId: currentTrack.id,
          title: currentTrack.title,
          artist: currentTrack.artist,
        })
        url = `/api/discover?${params.toString()}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to fetch recommendations")
      }

      const data = await response.json()
      setVideos(data.videos)
    } catch (err: any) {
      console.error("[v0] Discover More error:", err)
      setError(err.message || "Failed to load recommendations")
    } finally {
      setLoading(false)
    }
  }

  const handlePlay = (video: DiscoverVideo) => {
    setCurrentTrack({
      id: video.id,
      title: video.title,
      artist: video.artist,
      thumbnail: video.thumbnail,
      duration: "0:00",
    })
    setQueue([])
  }

  const handleAddToQueue = (video: DiscoverVideo) => {
    addToQueue({
      id: video.id,
      title: video.title,
      artist: video.artist,
      thumbnail: video.thumbnail,
      duration: "0:00",
    })
  }

  const handleAddToPlaylist = (video: DiscoverVideo, playlistId: string) => {
    addTrackToPlaylist(playlistId, {
      id: video.id,
      title: video.title,
      artist: video.artist,
      thumbnail: video.thumbnail,
      duration: "0:00",
    })
  }

  if (loading) {
    return (
      <section className="mb-12">
        <h2 className="text-xl md:text-2xl font-bold text-green-600 mb-6">Discover More</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg p-4 animate-pulse">
              <div className="aspect-square bg-secondary rounded-md mb-4" />
              <div className="h-4 bg-secondary rounded mb-2" />
              <div className="h-3 bg-secondary rounded w-2/3" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="mb-12">
        <h2 className="text-xl md:text-2xl font-bold text-green-600 mb-6">Discover More</h2>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <p className="text-destructive">{error}</p>
          <Button onClick={fetchRecommendations} variant="outline" className="mt-4 bg-transparent">
            Try Again
          </Button>
        </div>
      </section>
    )
  }

  if (videos.length === 0) return null

  return (
    <section className="mb-12">
      <h2 className="text-xl md:text-2xl font-bold text-green-600 mb-6">Discover More</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {videos.map((video) => (
          <Card
            key={video.id}
            className="bg-card hover:bg-card/80 rounded-lg p-4 transition-all cursor-pointer group hover:scale-[1.02] border-none"
          >
            <div className="relative mb-4 aspect-square rounded-md overflow-hidden bg-secondary">
              <Image src={video.thumbnail || "/placeholder.svg"} alt={video.title} fill className="object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="icon"
                  className="bg-green-600 hover:bg-green-700 rounded-full h-10 w-10"
                  onClick={() => handlePlay(video)}
                  aria-label={`Play ${video.title}`}
                >
                  <Play fill="currentColor" size={18} />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="rounded-full h-10 w-10"
                      aria-label="Add to playlist or queue"
                    >
                      <Plus size={18} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleAddToQueue(video)}>Add to Queue</DropdownMenuItem>
                    {playlists.length > 0 && <DropdownMenuItem disabled>Add to Playlist:</DropdownMenuItem>}
                    {playlists.map((playlist) => (
                      <DropdownMenuItem key={playlist.id} onClick={() => handleAddToPlaylist(video, playlist.id)}>
                        {playlist.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <h3 className="font-semibold text-sm mb-1 line-clamp-2">{video.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">{video.artist}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}
