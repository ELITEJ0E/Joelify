"use client"

import { useState, useEffect } from "react"
import { Menu, Target, MoreVertical, Play, Plus, Loader2 } from "lucide-react"
import { TrackImage as Image } from "./TrackImage"
import { useApp } from "@/contexts/AppContext"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getCachedData, setCachedData } from "@/lib/cache"

interface ChartVideo {
  id: string
  title: string
  artist: string
  thumbnail: string
  viewCount?: string
}

interface ChartsViewProps {
  onNavigate?: (view: any) => void
  onOpenSidebar?: () => void
}

export function ChartsView({ onNavigate, onOpenSidebar }: ChartsViewProps) {
  const [activeTab, setActiveTab] = useState<"local" | "global">("local")
  const [regionCode, setRegionCode] = useState("US")
  const [videos, setVideos] = useState<ChartVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const {
    setCurrentTrack,
    setQueue,
    addToQueue,
    playlists,
    addTrackToPlaylist,
    setPlaybackSource,
  } = useApp()

  useEffect(() => {
    fetchCharts(activeTab === "local" ? regionCode : "US")
  }, [activeTab, regionCode])

  const fetchCharts = async (region: string) => {
    const cacheKey = `charts_${activeTab}_${region}`
    const cached = getCachedData<ChartVideo[]>(cacheKey)
    if (cached && cached.length > 0) {
      setVideos(cached)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/charts?regionCode=${encodeURIComponent(region)}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to load top charts")
      }
      const data = await res.json()
      setVideos(data.videos || [])
      setCachedData(cacheKey, data.videos || [])
    } catch (err: any) {
      console.error("[ChartsView] Error:", err)
      setError(err.message || "Failed to load charts")
    } finally {
      setLoading(false)
    }
  }

  const handlePlayTrack = (video: ChartVideo, index: number) => {
    setPlaybackSource("youtube")
    const trackObj = {
      id: video.id,
      title: video.title,
      artist: video.artist,
      thumbnail: video.thumbnail,
      duration: "0:00",
    }
    setCurrentTrack(trackObj)

    const remaining = videos.slice(index + 1).map((v) => ({
      id: v.id,
      title: v.title,
      artist: v.artist,
      thumbnail: v.thumbnail,
      duration: "0:00",
    }))
    setQueue(remaining)
  }

  const handleAddToQueue = (video: ChartVideo) => {
    addToQueue({
      id: video.id,
      title: video.title,
      artist: video.artist,
      thumbnail: video.thumbnail,
      duration: "0:00",
    })
  }

  const handleAddToPlaylist = (video: ChartVideo, playlistId: string) => {
    addTrackToPlaylist(playlistId, {
      id: video.id,
      title: video.title,
      artist: video.artist,
      thumbnail: video.thumbnail,
      duration: "0:00",
    })
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-[hsl(var(--primary)/0.06)] to-transparent text-foreground p-4 md:p-8 overflow-y-auto pb-28">
      <div className="max-w-4xl mx-auto">
        {/* HEADER ROW */}
        <div className="flex items-center justify-between mb-6 pt-2">
          <div className="w-10" />

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-center">
            Top Charts
          </h1>

          <Button
            size="icon"
            variant="ghost"
            className="text-gray-300 hover:text-white hover:bg-white/10"
            onClick={() => {
              // Toggle or refresh location
              const nextRegion = regionCode === "US" ? "GB" : "US"
              setRegionCode(nextRegion)
            }}
            title={`Region: ${regionCode}`}
          >
            <Target size={22} className="text-primary" />
          </Button>
        </div>

        {/* TABS ROW */}
        <div className="flex justify-center border-b border-white/10 mb-6">
          <button
            onClick={() => setActiveTab("local")}
            className={`px-8 py-3 font-semibold text-sm transition-all relative ${
              activeTab === "local" ? "text-primary font-bold" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Local
            {activeTab === "local" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("global")}
            className={`px-8 py-3 font-semibold text-sm transition-all relative ${
              activeTab === "global" ? "text-primary font-bold" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Global
            {activeTab === "global" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="space-y-3 py-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-2 bg-white/[0.02] rounded-xl animate-pulse">
                <div className="w-14 h-14 bg-secondary/60 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-secondary/60 rounded w-1/2" />
                  <div className="h-3 bg-secondary/40 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ERROR STATE */}
        {error && !loading && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center my-8">
            <p className="text-destructive font-medium mb-3">{error}</p>
            <Button
              onClick={() => fetchCharts(activeTab === "local" ? regionCode : "US")}
              variant="outline"
              size="sm"
            >
              Retry
            </Button>
          </div>
        )}

        {/* RANKED LIST */}
        {!loading && !error && videos.length > 0 && (
          <div className="space-y-2">
            {videos.map((video, index) => (
              <div
                key={video.id}
                onClick={() => handlePlayTrack(video, index)}
                className="group flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.08] transition-all duration-200 cursor-pointer border border-transparent hover:border-white/[0.08]"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  {/* Small Square Thumbnail */}
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-secondary shadow">
                    <Image
                      src={video.thumbnail || "/placeholder.svg"}
                      alt={video.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play fill="currentColor" size={18} className="text-white ml-0.5" />
                    </div>
                  </div>

                  {/* Title & Artist */}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm md:text-base text-white group-hover:text-primary transition-colors line-clamp-1">
                      {index + 1}. {video.title}
                    </h3>
                    <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                      {video.artist}
                    </p>
                  </div>
                </div>

                {/* 3-Dot Overflow Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => e.stopPropagation()}
                      className="h-9 w-9 text-gray-400 hover:text-white hover:bg-white/10 rounded-full shrink-0"
                    >
                      <MoreVertical size={18} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-white/10 text-white">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddToQueue(video)
                      }}
                      className="hover:bg-primary/20 focus:bg-primary/20 cursor-pointer"
                    >
                      <Plus size={16} className="mr-2" /> Add to Queue
                    </DropdownMenuItem>
                    {playlists.map((playlist) => (
                      <DropdownMenuItem
                        key={playlist.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddToPlaylist(video, playlist.id)
                        }}
                        className="hover:bg-primary/20 focus:bg-primary/20 cursor-pointer"
                      >
                        Add to: {playlist.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
