"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Play,
  Pause,
  Shuffle,
  ListPlus,
  ArrowLeft,
  Clock,
  Music2,
  Disc3,
  Heart,
  MoreVertical,
  Share2,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { TrackImage as Image } from "./TrackImage"
import { useApp } from "@/contexts/AppContext"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AlbumDetails, AlbumTrack } from "@/lib/music/types"
import { getCachedData, setCachedData } from "@/lib/cache"

interface AlbumViewProps {
  albumId: string
  onNavigate: (view: any, params?: any) => void
  onBack?: () => void
}

export function AlbumView({ albumId, onNavigate, onBack }: AlbumViewProps) {
  const [album, setAlbum] = useState<AlbumDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const {
    currentTrack,
    setCurrentTrack,
    setQueue,
    addToQueue,
    playlists,
    addTrackToPlaylist,
    toggleLikedSong,
    isTrackLiked,
    setPlaybackSource,
  } = useApp()

  const fetchAlbum = useCallback(async (id: string) => {
    if (!id) return
    setIsLoading(true)
    setError(null)

    const cacheKey = `album_details_${id}`
    const cached = getCachedData<AlbumDetails>(cacheKey, sessionStorage)
    if (cached) {
      setAlbum(cached)
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/music/album?id=${encodeURIComponent(id)}`)
      if (!res.ok) {
        throw new Error(`Failed to load album (${res.status})`)
      }
      const data: AlbumDetails = await res.json()
      setAlbum(data)
      setCachedData(cacheKey, data, sessionStorage)
    } catch (err: any) {
      console.error("[AlbumView] Error loading album:", err)
      setError(err?.message || "Failed to load album details.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (albumId) {
      fetchAlbum(albumId)
    }
  }, [albumId, fetchAlbum])

  // Convert AlbumTrack to Player Track model
  const toPlayerTrack = (track: AlbumTrack, fallbackThumbnail?: string) => ({
    id: track.id,
    title: track.title,
    artist: track.artist,
    thumbnail: track.thumbnail || fallbackThumbnail || album?.thumbnail || "",
    duration: track.duration,
    album: album?.title,
  })

  // Play whole album from the beginning in original track sequence
  const handlePlayAlbum = () => {
    if (!album || album.tracks.length === 0) return
    setPlaybackSource("youtube")
    const firstTrack = toPlayerTrack(album.tracks[0])
    setCurrentTrack(firstTrack as any)

    const remainingTracks = album.tracks.slice(1).map((t) => toPlayerTrack(t))
    setQueue(remainingTracks as any)
  }

  // Shuffle play album
  const handleShuffleAlbum = () => {
    if (!album || album.tracks.length === 0) return
    setPlaybackSource("youtube")
    const shuffled = [...album.tracks].sort(() => Math.random() - 0.5)
    const firstTrack = toPlayerTrack(shuffled[0])
    setCurrentTrack(firstTrack as any)

    const remaining = shuffled.slice(1).map((t) => toPlayerTrack(t))
    setQueue(remaining as any)
  }

  // Play a specific track and queue the rest of the album after it in order
  const handlePlayTrack = (trackIndex: number) => {
    if (!album) return
    setPlaybackSource("youtube")
    const selected = album.tracks[trackIndex]
    setCurrentTrack(toPlayerTrack(selected) as any)

    const followingTracks = album.tracks.slice(trackIndex + 1).map((t) => toPlayerTrack(t))
    setQueue(followingTracks as any)
  }

  // Add all album tracks to current queue
  const handleAddAllToQueue = () => {
    if (!album) return
    for (const track of album.tracks) {
      addToQueue(toPlayerTrack(track) as any)
    }
  }

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-zinc-900 to-black text-foreground min-h-[60vh]">
        <Loader2 className="animate-spin text-primary mb-4" size={48} />
        <p className="text-sm text-gray-400">Loading album...</p>
      </div>
    )
  }

  if (error || !album) {
    return (
      <div className="flex-1 p-6 md:p-10 bg-gradient-to-b from-zinc-900 to-black text-foreground">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onBack?.() || onNavigate("search")}
          className="text-gray-400 hover:text-white hover:bg-zinc-800 gap-2 mb-6"
        >
          <ArrowLeft size={16} />
          Back to Search
        </Button>
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-8 max-w-lg mx-auto text-center space-y-4">
          <AlertCircle className="mx-auto text-destructive" size={48} />
          <h2 className="text-xl font-bold text-white">Could Not Load Album</h2>
          <p className="text-sm text-gray-400">{error || "Album data is currently unavailable."}</p>
          <Button onClick={() => fetchAlbum(albumId)} variant="outline" className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const isCurrentPlayingAlbum =
    currentTrack && album.tracks.some((t) => t.id === currentTrack.id)

  return (
    <div className="flex-1 bg-gradient-to-b from-zinc-900/90 via-black/95 to-black text-foreground p-4 md:p-8 overflow-y-auto pb-32">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onBack?.() || onNavigate("search")}
            className="text-gray-400 hover:text-white hover:bg-zinc-800/80 gap-2 rounded-full px-4"
          >
            <ArrowLeft size={16} />
            Back
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="text-gray-400 hover:text-white hover:bg-zinc-800/80 gap-2 rounded-full px-4 text-xs"
          >
            {copied ? <Check size={14} className="text-primary" /> : <Share2 size={14} />}
            {copied ? "Link Copied" : "Share"}
          </Button>
        </div>

        {/* Album Cinematic Hero Header */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 pt-2 pb-6 border-b border-white/[0.08]">
          <div className="relative group shrink-0 w-48 h-48 md:w-60 md:h-60 rounded-2xl overflow-hidden shadow-2xl bg-zinc-800 ring-1 ring-white/10">
            {album.thumbnail ? (
              <Image
                src={album.thumbnail}
                alt={album.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 192px, 240px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-gray-500">
                <Disc3 size={64} />
              </div>
            )}
          </div>

          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-[11px] font-bold tracking-widest uppercase bg-primary/20 text-primary px-2.5 py-1 rounded-full border border-primary/30">
                Album
              </span>
              {album.year && (
                <span className="text-xs text-gray-400 font-medium">
                  • {album.year}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              {album.title}
            </h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm text-gray-300">
              <button
                type="button"
                onClick={() => {
                  onNavigate("search", { query: album.artist })
                }}
                className="font-bold text-white hover:text-primary hover:underline transition-colors"
              >
                {album.artist}
              </button>
              <span className="text-gray-500">•</span>
              <span>{album.trackCount} {album.trackCount === 1 ? "track" : "tracks"}</span>
              {album.durationText && (
                <>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">{album.durationText}</span>
                </>
              )}
            </div>

            {album.description && (
              <p className="text-xs text-gray-400 line-clamp-2 max-w-2xl pt-1">
                {album.description}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-3">
              <Button
                onClick={handlePlayAlbum}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 h-12 rounded-full gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-all"
              >
                <Play size={20} fill="currentColor" />
                Play Album
              </Button>

              <Button
                variant="outline"
                onClick={handleShuffleAlbum}
                className="border-white/15 bg-zinc-900/80 hover:bg-zinc-800 text-white rounded-full h-12 px-5 gap-2"
              >
                <Shuffle size={18} />
                Shuffle
              </Button>

              <Button
                variant="ghost"
                onClick={handleAddAllToQueue}
                title="Add all tracks to queue"
                className="border border-white/10 bg-zinc-900/40 hover:bg-zinc-800 text-gray-300 hover:text-white rounded-full h-12 w-12 p-0"
              >
                <ListPlus size={18} />
              </Button>
            </div>
          </div>
        </div>

        {/* Track List Section */}
        <div className="space-y-2">
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-white/[0.06]">
            <span className="w-8 text-center">#</span>
            <span>Title</span>
            <span className="hidden sm:inline-flex items-center gap-1">
              <Clock size={12} />
              Duration
            </span>
            <span className="w-8"></span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {album.tracks.map((track, idx) => {
              const isPlaying = currentTrack?.id === track.id
              const liked = isTrackLiked(track.id)

              return (
                <div
                  key={track.id || idx}
                  className={`group grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                    isPlaying
                      ? "bg-primary/15 text-primary border border-primary/20"
                      : "hover:bg-zinc-900/80 text-gray-200"
                  }`}
                >
                  {/* Track Number / Hover Play */}
                  <div className="w-8 flex items-center justify-center">
                    <span className={`text-sm font-mono group-hover:hidden ${isPlaying ? "text-primary font-bold" : "text-gray-500"}`}>
                      {String(track.trackNumber).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePlayTrack(idx)}
                      className="hidden group-hover:flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-110 transition-transform"
                      aria-label={`Play ${track.title}`}
                    >
                      <Play size={12} fill="currentColor" className="translate-x-0.5" />
                    </button>
                  </div>

                  {/* Title & Artist */}
                  <div
                    className="min-w-0 cursor-pointer"
                    onClick={() => handlePlayTrack(idx)}
                  >
                    <p className={`text-sm font-semibold truncate ${isPlaying ? "text-primary" : "text-white group-hover:text-primary transition-colors"}`}>
                      {track.title}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {track.artist}
                    </p>
                  </div>

                  {/* Duration */}
                  <div className="text-xs text-gray-400 font-mono pr-2">
                    {track.duration || "--:--"}
                  </div>

                  {/* Actions (Like + Menu) */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleLikedSong(toPlayerTrack(track) as any)
                      }}
                      className={`p-1.5 rounded-full hover:bg-zinc-800 transition-colors ${
                        liked ? "text-primary" : "text-gray-400 opacity-0 group-hover:opacity-100 hover:text-white"
                      }`}
                      aria-label="Like song"
                    >
                      <Heart size={16} fill={liked ? "currentColor" : "none"} />
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white min-w-44">
                        <DropdownMenuItem
                          onClick={() => handlePlayTrack(idx)}
                          className="gap-2 cursor-pointer text-xs hover:bg-primary/20 focus:bg-primary/20"
                        >
                          <Play size={14} />
                          Play Now
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => addToQueue(toPlayerTrack(track) as any)}
                          className="gap-2 cursor-pointer text-xs hover:bg-primary/20 focus:bg-primary/20"
                        >
                          <ListPlus size={14} />
                          Add to Queue
                        </DropdownMenuItem>
                        {playlists.length > 0 && (
                          <>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <div className="px-2 py-1 text-[10px] uppercase text-gray-400 font-semibold tracking-wider">
                              Add to Playlist
                            </div>
                            {playlists.map((p) => (
                              <DropdownMenuItem
                                key={p.id}
                                onClick={() => addTrackToPlaylist(p.id, toPlayerTrack(track) as any)}
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
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
