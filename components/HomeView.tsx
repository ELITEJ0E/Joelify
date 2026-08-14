"use client"

import { useState } from "react"
import { useApp } from "@/contexts/AppContext"
import { Menu, Play, MoreVertical, Plus, Music2, Sparkles } from "lucide-react"
import { TrackImage as Image } from "./TrackImage"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface HomeViewProps {
  onNavigate: (view: "home" | "search" | "playlist" | "liked" | "library" | "stats" | "joels" | "downloaded" | "charts" | "explore") => void
  onOpenSidebar?: () => void
}

export function HomeView({ onNavigate }: HomeViewProps) {
  const {
    playlists,
    likedSongs,
    joelsSongs,
    recentlyPlayed,
    setCurrentPlaylistId,
    setCurrentTrack,
    setQueue,
    addRecentlyPlayed,
    addToQueue,
    addTrackToPlaylist,
    setPlaybackSource,
  } = useApp()

  const getTimeGreeting = () => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return "Good morning,"
    if (hour >= 12 && hour < 17) return "Good afternoon,"
    if (hour >= 17 && hour < 22) return "Good evening,"
    return "Good night,"
  }

  const handlePlayPlaylist = (playlistId: string) => {
    const playlist = playlists.find((p) => p.id === playlistId)
    if (!playlist || playlist.tracks.length === 0) return

    setCurrentPlaylistId(playlistId)
    setCurrentTrack(playlist.tracks[0])
    setQueue(playlist.tracks.slice(1))
    addRecentlyPlayed({ type: "playlist", id: playlistId })
  }

  const handleNavigateToPlaylist = (playlistId: string) => {
    setCurrentPlaylistId(playlistId)
    onNavigate("playlist")
  }

  // Get recent played tracks for "Last Session"
  const recentTracks = recentlyPlayed
    .filter((item) => item.type === "track")
    .map((item) => {
      // 1. Check in custom playlists
      for (const playlist of playlists) {
        const t = playlist.tracks.find((tr) => tr.id === item.id)
        if (t) return t
      }
      // 2. Check in liked songs
      const inLiked = likedSongs.find((tr) => tr.id === item.id)
      if (inLiked) return inLiked

      // 3. Check in Joel's songs
      const inJoels = joelsSongs.find((tr) => tr.id === item.id)
      if (inJoels) return inJoels

      return null
    })
    .filter((t): t is NonNullable<typeof t> => t !== null)

  return (
    <div className="flex-1 bg-gradient-to-b from-[hsl(var(--primary)/0.06)] to-transparent text-foreground p-4 md:p-8 overflow-y-auto pb-28">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* DYNAMIC TIME-BASED GREETING */}
        <div className="space-y-0.5 pt-1">
          <p className="text-primary font-bold text-base md:text-lg">{getTimeGreeting()}</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Joel</h1>
        </div>

        {/* JOEL'S SONGS SECTION (SCROLLABLE LEFT-RIGHT) */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-amber-400" />
              <h2 className="text-xl font-bold text-primary tracking-tight">Joel's Tracks</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("joels")}
              className="text-xs text-gray-400 hover:text-white"
            >
              View All ({joelsSongs.length})
            </Button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            {joelsSongs.map((track, idx) => (
              <div
                key={track.id || idx}
                onClick={() => {
                  setPlaybackSource("suno")
                  setCurrentTrack(track)
                  setQueue(joelsSongs.slice(idx + 1))
                }}
                className="flex-shrink-0 w-36 md:w-44 bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 backdrop-blur-xl rounded-2xl p-3 cursor-pointer group hover:scale-[1.02] transition-all duration-300 shadow-xl"
              >
                <div className="relative aspect-square rounded-xl bg-gradient-to-br from-amber-500/20 via-rose-500/20 to-violet-600/20 flex items-center justify-center mb-2.5 overflow-hidden shadow-lg border border-white/10">
                  <Image
                    src={track.thumbnail || "https://cdn2.suno.ai/24c69462-2727-415e-8f27-cdc43e0184db.jpeg?width=360"}
                    alt={track.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-black shadow-lg">
                      <Play fill="currentColor" size={20} className="ml-0.5" />
                    </div>
                  </div>
                </div>
                <h3 className="font-semibold text-sm text-white line-clamp-1 group-hover:text-primary transition-colors">
                  {track.title}
                </h3>
                <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                  {track.artist || "Joel"}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* YOUR PLAYLISTS SECTION */}
        <section className="space-y-3 pt-2">
          <h2 className="text-xl font-bold text-primary tracking-tight">Your Playlists</h2>

          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            {/* Joel's Playlist Card */}
            <div
              onClick={() => onNavigate("joels")}
              className="flex-shrink-0 w-36 md:w-44 bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 backdrop-blur-xl rounded-2xl p-3 cursor-pointer group hover:scale-[1.02] transition-all duration-300 shadow-xl"
            >
              <div className="relative aspect-square rounded-xl bg-gradient-to-br from-amber-500 via-rose-500 to-violet-600 flex items-center justify-center mb-2.5 overflow-hidden shadow-lg">
                <Image
                  src="https://cdn2.suno.ai/24c69462-2727-415e-8f27-cdc43e0184db.jpeg?width=360"
                  alt="Joel's Playlist"
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                <Sparkles className="absolute top-2 right-2 text-amber-300 drop-shadow-md" size={18} />
              </div>
              <h3 className="font-semibold text-sm text-white line-clamp-1 group-hover:text-primary transition-colors">
                Joel's Playlist
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {joelsSongs.length || 15} Exclusive Tracks
              </p>
            </div>

            {/* Liked Songs Card */}
            <div
              onClick={() => onNavigate("liked")}
              className="flex-shrink-0 w-36 md:w-44 bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 backdrop-blur-xl rounded-2xl p-3 cursor-pointer group hover:scale-[1.02] transition-all duration-300 shadow-xl"
            >
              <div className="relative aspect-square rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mb-2.5 overflow-hidden shadow-lg">
                <Music2 size={36} className="text-white" />
              </div>
              <h3 className="font-semibold text-sm text-white line-clamp-1 group-hover:text-primary transition-colors">
                Favorite Songs
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {likedSongs.length} {likedSongs.length === 1 ? "Song" : "Songs"}
              </p>
            </div>

            {/* Custom Playlists */}
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                onClick={() => handleNavigateToPlaylist(playlist.id)}
                className="flex-shrink-0 w-36 md:w-44 bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 backdrop-blur-xl rounded-2xl p-3 cursor-pointer group hover:scale-[1.02] transition-all duration-300 shadow-xl"
              >
                <div className="relative aspect-square rounded-xl bg-zinc-800/80 flex items-center justify-center mb-2.5 overflow-hidden shadow-lg">
                  {playlist.coverImage || playlist.tracks.length > 0 ? (
                    <Image
                      src={playlist.coverImage || playlist.tracks[0].thumbnail || "/placeholder.svg"}
                      alt={playlist.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <Music2 size={36} className="text-gray-500" />
                  )}
                </div>
                <h3 className="font-semibold text-sm text-white line-clamp-1 group-hover:text-primary transition-colors">
                  {playlist.name}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {playlist.tracks.length} {playlist.tracks.length === 1 ? "Song" : "Songs"}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* LAST SESSION SECTION */}
        <section className="space-y-3 pt-2">
          <h2 className="text-xl font-bold text-primary tracking-tight">Last Session</h2>

          {recentTracks.length === 0 ? (
            <div className="bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-2xl p-6 text-center text-gray-400 shadow-xl">
              <p className="text-sm">No recently played tracks yet.</p>
              <Button
                variant="link"
                className="text-primary mt-2 font-semibold"
                onClick={() => onNavigate("search")}
              >
                Explore Music
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTracks.slice(0, 10).map((track, index) => (
                <div
                  key={`${track.id}-${index}`}
                  onClick={() => {
                    setPlaybackSource("youtube")
                    setCurrentTrack(track)
                    setQueue([])
                  }}
                  className="group flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 backdrop-blur-xl transition-all duration-300 cursor-pointer shadow-lg"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-zinc-800 shadow">
                      <Image
                        src={track.thumbnail || "/placeholder.svg"}
                        alt={track.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play fill="currentColor" size={18} className="text-white ml-0.5" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm text-white group-hover:text-primary transition-colors line-clamp-1">
                        {track.title}
                      </h3>
                      <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                        {track.artist}
                      </p>
                    </div>
                  </div>

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
                          addToQueue(track)
                        }}
                        className="hover:bg-primary/20 focus:bg-primary/20 cursor-pointer"
                      >
                        <Plus size={16} className="mr-2" /> Add to Queue
                      </DropdownMenuItem>
                      {playlists.map((pl) => (
                        <DropdownMenuItem
                          key={pl.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            addTrackToPlaylist(pl.id, track)
                          }}
                          className="hover:bg-primary/20 focus:bg-primary/20 cursor-pointer"
                        >
                          Add to: {pl.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
