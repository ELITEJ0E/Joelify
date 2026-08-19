"use client"

import { useState, useEffect } from "react"
import { Target, MoreVertical, Play, Plus, Globe, Sparkles, ChevronDown } from "lucide-react"
import { TrackImage as Image } from "./TrackImage"
import { useApp } from "@/contexts/AppContext"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getCachedData, setCachedData } from "@/lib/cache"
import { ALL_REGIONS, ASIAN_REGIONS, INTERNATIONAL_REGIONS, FEATURED_REGIONS, getRegion } from "@/lib/regions"

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
  const [regionCode, setRegionCode] = useState("MY")
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

  const currentRegion = regionCode === "GLOBAL" 
    ? { code: "GLOBAL", name: "Global Charts", flag: "🌐" }
    : getRegion(regionCode)

  useEffect(() => {
    fetchCharts(regionCode)
  }, [regionCode])

  const fetchCharts = async (region: string) => {
    const cacheKey = `charts_feed_${region}`
    const cached = getCachedData<ChartVideo[]>(cacheKey)
    if (cached && cached.length > 0) {
      setVideos(cached)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const targetRegion = region === "GLOBAL" ? "US" : region
      const res = await fetch(`/api/charts?regionCode=${encodeURIComponent(targetRegion)}`)
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

  const handlePlayAll = () => {
    if (videos.length === 0) return
    handlePlayTrack(videos[0], 0)
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
    <div className="flex-1 bg-gradient-to-b from-[hsl(var(--primary)/0.08)] via-black to-black text-foreground p-4 md:p-8 overflow-y-auto pb-28">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* HEADER ROW */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentRegion.flag}</span>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  Top Charts
                </h1>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Most popular music in {currentRegion.name} • Updated regularly
              </p>
            </div>
          </div>

          {/* REGION DROPDOWN SELECTOR */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="rounded-full border-white/20 bg-zinc-900/90 text-white text-xs font-semibold hover:bg-zinc-800 flex items-center gap-2 h-9 px-3.5 shadow-sm"
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

        {/* QUICK REGION FILTER CHIPS (Scrollable Left to Right) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
            <span>Filter by Asian & Global Charts:</span>
            {videos.length > 0 && !loading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePlayAll}
                className="text-primary hover:text-primary hover:bg-primary/10 h-7 text-xs px-2.5"
              >
                <Play size={12} fill="currentColor" className="mr-1.5" /> Play All
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {FEATURED_REGIONS.map((r) => {
              const isSelected = regionCode === r.code
              return (
                <button
                  key={r.code}
                  onClick={() => setRegionCode(r.code)}
                  className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all select-none cursor-pointer border ${
                    isSelected
                      ? "bg-primary text-black border-primary shadow-md shadow-primary/20 scale-105"
                      : "bg-white/5 hover:bg-white/10 text-gray-300 border-white/10 hover:border-white/20"
                  }`}
                >
                  <span>{r.flag}</span>
                  <span>{r.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="space-y-3 py-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-2.5 bg-white/[0.02] rounded-xl animate-pulse">
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
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 text-center my-6">
            <p className="text-destructive font-medium mb-3 text-sm">{error}</p>
            <Button
              onClick={() => fetchCharts(regionCode)}
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              Retry {currentRegion.name} Charts
            </Button>
          </div>
        )}

        {/* RANKED LIST */}
        {!loading && !error && videos.length > 0 && (
          <div className="space-y-2">
            {videos.map((video, index) => {
              const rank = index + 1
              const isTop3 = rank <= 3
              return (
                <div
                  key={video.id}
                  onClick={() => handlePlayTrack(video, index)}
                  className="group flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.08] transition-all duration-200 cursor-pointer border border-transparent hover:border-white/[0.08]"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    {/* Rank Badge */}
                    <div className="w-6 text-center font-bold text-sm shrink-0">
                      <span className={isTop3 ? "text-primary font-black text-base" : "text-gray-500"}>
                        {rank}
                      </span>
                    </div>

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
                        {video.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400 line-clamp-1">
                          {video.artist}
                        </p>
                        {video.viewCount && (
                          <span className="text-[10px] text-gray-500 hidden sm:inline">
                            • {parseInt(video.viewCount).toLocaleString()} views
                          </span>
                        )}
                      </div>
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
                    <DropdownMenuContent align="end" className="bg-black/95 backdrop-blur-xl border-white/10 text-white">
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
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
