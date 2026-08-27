"use client"

import { useState, useEffect } from "react"
import { Search, Play, ChevronDown, Plus, MoreVertical, ArrowLeft, ListPlus, ListMusic, Flame } from "lucide-react"
import { TrackImage as Image } from "./TrackImage"
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { getCachedData, setCachedData } from "@/lib/cache"

import { ALL_REGIONS, ASIAN_REGIONS, INTERNATIONAL_REGIONS, FEATURED_REGIONS, getRegion } from "@/lib/regions"

interface VideoItem {
  id: string
  title: string
  artist: string
  thumbnail: string
  viewCount?: string
}

interface ExploreViewProps {
  onNavigate: (view: any) => void
  onOpenSidebar?: () => void
}

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

export function ExploreView({ onNavigate, onOpenSidebar }: ExploreViewProps) {
  const [regionCode, setRegionCode] = useState("MY")
  const [heroVideos, setHeroVideos] = useState<VideoItem[]>([])
  const [trendingVideos, setTrendingVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [genreVideos, setGenreVideos] = useState<VideoItem[]>([])
  const [genreLoading, setGenreLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const {
    setCurrentTrack,
    setQueue,
    addToQueue,
    playlists,
    addTrackToPlaylist,
    setPlaybackSource,
  } = useApp()

  const currentRegion = getRegion(regionCode)

  useEffect(() => {
    fetchExploreData(regionCode)
  }, [regionCode])

  const fetchExploreData = async (region: string) => {
    const cacheKey = `explore_data_${region}`
    const cached = getCachedData<any>(cacheKey)
    if (cached) {
      setHeroVideos(cached.hero || [])
      setTrendingVideos(cached.trending || [])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/explore?regionCode=${encodeURIComponent(region)}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to load explore data")
      }
      const data = await res.json()
      setHeroVideos(data.hero || [])
      setTrendingVideos(data.trending || [])
      setCachedData(cacheKey, data)
    } catch (err: any) {
      console.error("[ExploreView] Error:", err)
      setError(err.message || "Failed to load explore content")
    } finally {
      setLoading(false)
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
      console.error("[ExploreView] Genre fetch error:", err)
    } finally {
      setGenreLoading(false)
    }
  }

  const handlePlayTrack = (video: VideoItem, list: VideoItem[], index: number) => {
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      onNavigate("search")
    }
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-black via-zinc-950 to-black text-foreground p-4 md:p-8 overflow-y-auto pb-44 md:pb-52">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* HEADER: SEARCH BAR */}
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="Songs, albums or artists"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => onNavigate("search")}
              className="pl-10 h-11 rounded-xl bg-zinc-900/90 border-white/10 text-white placeholder:text-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </form>
        </div>

        {/* REGION SELECTION HEADER & CHIPS */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xl">{currentRegion.flag}</span>
              <h2 className="text-base font-bold text-white whitespace-nowrap">Trending in {currentRegion.name}</h2>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-full border-white/20 bg-zinc-900/80 text-white text-xs font-medium hover:bg-zinc-800 flex items-center gap-2 h-8 px-3.5"
                >
                  <span>{currentRegion.flag}</span>
                  <span>{currentRegion.name}</span>
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
                      regionCode === r.code ? "bg-primary/20 text-primary font-bold" : ""
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
                      regionCode === r.code ? "bg-primary/20 text-primary font-bold" : ""
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

          {/* Quick Asian & International Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {FEATURED_REGIONS.map((r) => {
              const isSelected = regionCode === r.code
              return (
                <button
                  key={r.code}
                  onClick={() => setRegionCode(r.code)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all select-none cursor-pointer border ${
                    isSelected
                      ? "bg-primary text-black border-primary font-bold shadow-sm"
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

        {/* IF A GENRE IS SELECTED, SHOW FILTERED LIST */}
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
                    onClick={() => handlePlayTrack(video, genreVideos, idx)}
                    className="group flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.08] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-secondary">
                        <Image src={video.thumbnail || "/placeholder.svg"} alt={video.title} fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Play size={16} fill="currentColor" className="text-primary" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm text-white line-clamp-1 group-hover:text-primary transition-colors">
                          {idx + 1}. {video.title}
                        </h3>
                        <p className="text-xs text-gray-400 line-clamp-1">{video.artist}</p>
                      </div>
                    </div>

                    {/* Actions menu (3 dots) */}
                    <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                            aria-label="More options"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 bg-zinc-900/95 backdrop-blur-xl border-white/10 text-white">
                          <DropdownMenuItem
                            onClick={() => handlePlayTrack(video, genreVideos, idx)}
                            className="gap-2 cursor-pointer text-xs hover:bg-primary/20 focus:bg-primary/20"
                          >
                            <Play size={14} />
                            Play Now
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              addToQueue({
                                id: video.id,
                                title: video.title,
                                artist: video.artist,
                                thumbnail: video.thumbnail,
                                duration: "0:00",
                              })
                            }
                            className="gap-2 cursor-pointer text-xs hover:bg-primary/20 focus:bg-primary/20"
                          >
                            <ListPlus size={14} />
                            Add to Queue
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="gap-2 cursor-pointer text-xs hover:bg-primary/20 focus:bg-primary/20">
                              <ListMusic size={14} className="text-primary" />
                              Add to Playlist
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-48 bg-zinc-900/95 backdrop-blur-xl border-white/10 text-white">
                              {playlists.length === 0 ? (
                                <div className="p-3 text-xs text-gray-400 text-center">No playlists created yet</div>
                              ) : (
                                playlists.map((p) => (
                                  <DropdownMenuItem
                                    key={p.id}
                                    onClick={() =>
                                      addTrackToPlaylist(p.id, {
                                        id: video.id,
                                        title: video.title,
                                        artist: video.artist,
                                        thumbnail: video.thumbnail,
                                        duration: "0:00",
                                      })
                                    }
                                    className="gap-2 cursor-pointer text-xs hover:bg-primary/20 focus:bg-primary/20"
                                  >
                                    <ListMusic size={13} className="text-primary shrink-0" />
                                    <span className="truncate">{p.name}</span>
                                  </DropdownMenuItem>
                                ))
                              )}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* HERO FEATURE STRIP */}
            {!loading && heroVideos.length > 0 && (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                {heroVideos.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => handlePlayTrack(item, heroVideos, idx)}
                    className="flex-shrink-0 w-72 md:w-80 group cursor-pointer bg-zinc-900/40 border border-white/5 rounded-2xl p-2.5 hover:border-primary/30 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-secondary shadow-lg mb-2">
                        <Image
                          src={item.thumbnail || "/placeholder.svg"}
                          alt={item.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-primary text-black flex items-center justify-center shadow-lg">
                            <Play fill="currentColor" size={16} className="translate-x-0.5" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start justify-between gap-2 mt-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm text-white line-clamp-1 group-hover:text-primary transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-xs text-gray-400 line-clamp-1">{item.artist}</p>
                        </div>

                        {/* 3 dots menu */}
                        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                aria-label="More options"
                              >
                                <MoreVertical size={15} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 bg-zinc-900/95 backdrop-blur-xl border-white/10 text-white">
                              <DropdownMenuItem
                                onClick={() => handlePlayTrack(item, heroVideos, idx)}
                                className="gap-2 cursor-pointer text-xs hover:bg-primary/20 focus:bg-primary/20"
                              >
                                <Play size={14} />
                                Play Now
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  addToQueue({
                                    id: item.id,
                                    title: item.title,
                                    artist: item.artist,
                                    thumbnail: item.thumbnail,
                                    duration: "0:00",
                                  })
                                }
                                className="gap-2 cursor-pointer text-xs hover:bg-primary/20 focus:bg-primary/20"
                              >
                                <ListPlus size={14} />
                                Add to Queue
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="gap-2 cursor-pointer text-xs hover:bg-primary/20 focus:bg-primary/20">
                                  <ListMusic size={14} className="text-primary" />
                                  Add to Playlist
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="w-48 bg-zinc-900/95 backdrop-blur-xl border-white/10 text-white">
                                  {playlists.length === 0 ? (
                                    <div className="p-3 text-xs text-gray-400 text-center">No playlists created yet</div>
                                  ) : (
                                    playlists.map((p) => (
                                      <DropdownMenuItem
                                        key={p.id}
                                        onClick={() =>
                                          addTrackToPlaylist(p.id, {
                                            id: item.id,
                                            title: item.title,
                                            artist: item.artist,
                                            thumbnail: item.thumbnail,
                                            duration: "0:00",
                                          })
                                        }
                                        className="gap-2 cursor-pointer text-xs hover:bg-primary/20 focus:bg-primary/20"
                                      >
                                        <ListMusic size={13} className="text-primary shrink-0" />
                                        <span className="truncate">{p.name}</span>
                                      </DropdownMenuItem>
                                    ))
                                  )}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VIDEO CHARTS SECTION */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary tracking-tight">Video charts</h2>

              {loading ? (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-44 h-52 bg-white/[0.03] rounded-2xl animate-pulse shrink-0" />
                  ))}
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                  {/* Card 1: Trending 20 */}
                  <div
                    onClick={() => onNavigate("charts")}
                    className="flex-shrink-0 w-44 md:w-48 bg-gradient-to-br from-red-600/80 to-zinc-900 border border-white/10 rounded-2xl p-4 flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform shadow-lg"
                  >
                    <div>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-red-200">TRENDING</span>
                      <h3 className="text-2xl font-black text-white mt-1">TOP 20</h3>
                    </div>
                    <div className="mt-6">
                      <p className="text-xs font-semibold text-white">Trending {currentRegion.name}</p>
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
                      <p className="text-xs text-red-400 font-semibold">LIVE PERFORMANCES</p>
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
              )}
            </section>

            {/* TRENDING NOW IN REGION SECTION */}
            {!loading && trendingVideos.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Flame size={20} className="text-orange-500" />
                  <h2 className="text-xl font-bold text-white tracking-tight">Trending in {currentRegion.name}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {trendingVideos.slice(0, 8).map((video, idx) => (
                    <div
                      key={video.id}
                      onClick={() => handlePlayTrack(video, trendingVideos, idx)}
                      className="group bg-zinc-900/60 border border-white/[0.06] hover:border-primary/30 rounded-2xl overflow-hidden p-3 cursor-pointer transition-all hover:bg-zinc-900 flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-800 mb-2.5">
                          <Image src={video.thumbnail || "/placeholder.svg"} alt={video.title} fill className="object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                              <Play size={16} fill="currentColor" className="translate-x-0.5" />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start justify-between gap-2 mt-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white truncate group-hover:text-primary transition-colors">{video.title}</p>
                            <p className="text-xs text-gray-400 truncate">{video.artist}</p>
                          </div>

                          {/* 3 dots menu */}
                          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                  aria-label="More options"
                                >
                                  <MoreVertical size={15} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 bg-zinc-900/95 backdrop-blur-xl border-white/10 text-white">
                                <DropdownMenuItem
                                  onClick={() => handlePlayTrack(video, trendingVideos, idx)}
                                  className="gap-2 cursor-pointer text-xs hover:bg-primary/20 focus:bg-primary/20"
                                >
                                  <Play size={14} />
                                  Play Now
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    addToQueue({
                                      id: video.id,
                                      title: video.title,
                                      artist: video.artist,
                                      thumbnail: video.thumbnail,
                                      duration: "0:00",
                                    })
                                  }
                                  className="gap-2 cursor-pointer text-xs hover:bg-primary/20 focus:bg-primary/20"
                                >
                                  <ListPlus size={14} />
                                  Add to Queue
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger className="gap-2 cursor-pointer text-xs hover:bg-primary/20 focus:bg-primary/20">
                                    <ListMusic size={14} className="text-primary" />
                                    Add to Playlist
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent className="w-48 bg-zinc-900/95 backdrop-blur-xl border-white/10 text-white">
                                    {playlists.length === 0 ? (
                                      <div className="p-3 text-xs text-gray-400 text-center">No playlists created yet</div>
                                    ) : (
                                      playlists.map((p) => (
                                        <DropdownMenuItem
                                          key={p.id}
                                          onClick={() =>
                                            addTrackToPlaylist(p.id, {
                                              id: video.id,
                                              title: video.title,
                                              artist: video.artist,
                                              thumbnail: video.thumbnail,
                                              duration: "0:00",
                                            })
                                          }
                                          className="gap-2 cursor-pointer text-xs hover:bg-primary/20 focus:bg-primary/20"
                                        >
                                          <ListMusic size={13} className="text-primary shrink-0" />
                                          <span className="truncate">{p.name}</span>
                                        </DropdownMenuItem>
                                      ))
                                    )}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* GENRES SECTION */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary tracking-tight">Genres</h2>

              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                {GENRES.map((g) => (
                  <div
                    key={g.name}
                    onClick={() => handleSelectGenre(g.name)}
                    className={`shrink-0 w-36 sm:w-44 md:flex-1 bg-gradient-to-br ${g.color} border border-white/10 rounded-2xl p-4 h-24 flex flex-col justify-between cursor-pointer hover:scale-[1.03] transition-transform shadow-lg relative overflow-hidden group select-none`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">TOP 50</span>
                    <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">
                      {g.name}
                    </h3>
                  </div>
                ))}
              </div>
            </section>

            {/* Bottom scroll spacing clearance */}
            <div className="h-12 md:h-16 w-full shrink-0" aria-hidden="true" />
          </>
        )}
      </div>
    </div>
  )
}
