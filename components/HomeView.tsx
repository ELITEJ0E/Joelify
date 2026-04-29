"use client"

import { useApp } from "@/contexts/AppContext"
import { Play, Clock, TrendingUp, Music2 } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DiscoverMore } from "./DiscoverMore"

interface HomeViewProps {
  onNavigate: (view: "home" | "search" | "playlist" | "liked" | "library" | "stats" | "joels") => void
}

import { FALLBACK_JOELS_SONGS as JOELS_FALLBACK_SONGS } from "@/lib/constants"

export function HomeView({ onNavigate }: HomeViewProps) {
  const { 
    playlists, 
    likedSongs, 
    recentlyPlayed, 
    setCurrentPlaylistId, 
    setCurrentTrack, 
    setQueue, 
    addRecentlyPlayed, 
    setPlaybackSource,
    joelsSongs 
  } = useApp()

  const playSunoTrack = (id: string, title: string, artist: string, thumbnail?: string) => {
    setPlaybackSource("suno")
    setCurrentTrack({
      id,
      title,
      artist,
      thumbnail: thumbnail || "/placeholder.svg",
      streamUrl: "", // Handled by SunoPlayer
      duration: "0:00",
    })
    setQueue([])
    setCurrentPlaylistId("joels_music")
  }

  const handlePlayPlaylist = (playlistId: string) => {
    const playlist = playlists.find((p) => p.id === playlistId)
    if (!playlist || playlist.tracks.length === 0) return

    setCurrentPlaylistId(playlistId)
    setCurrentTrack(playlist.tracks[0])
    setQueue(playlist.tracks.slice(1))
    addRecentlyPlayed({ type: "playlist", id: playlistId })
  }

  const handlePlayLikedSongs = () => {
    if (likedSongs.length === 0) return
    setCurrentTrack(likedSongs[0])
    setQueue(likedSongs.slice(1))
  }

  const handleNavigateToPlaylist = (playlistId: string) => {
    setCurrentPlaylistId(playlistId)
    onNavigate("playlist")
  }

  // Get recently played playlists
  const recentPlaylists = recentlyPlayed
    .filter((item) => item.type === "playlist")
    .map((item) => playlists.find((p) => p.id === item.id))
    .filter(Boolean)
    .slice(0, 6)

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-[hsl(var(--primary)/0.06)] to-transparent text-foreground p-4 md:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-bold mb-8">{getGreeting()}</h1>

        {/* Joel's Music Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-primary/20 shadow-lg shadow-primary/10 flex-shrink-0">
                <Image 
                  src={`https://cdn2.suno.ai/24c69462-2727-415e-8f27-cdc43e0184db.jpeg?width=360`} 
                  alt="Joel" 
                  width={48} 
                  height={48} 
                  className="w-full h-full object-cover transition-all duration-500" 
                  referrerPolicy="no-referrer" 
                />
              </div>
              <div className="flex items-center gap-3">
                <Music2 size={24} className="text-primary hidden sm:block" />
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Joel's Music</h2>
              </div>
            </div>
            <Button 
              variant="link" 
              className="text-primary font-bold hover:no-underline"
              onClick={() => onNavigate("joels")}
            >
              View All
            </Button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            {joelsSongs.slice(0, 6).map((track) => (
              <div
                key={track.id}
                className="flex-shrink-0 w-40 md:w-48 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] backdrop-blur-xl rounded-xl p-4 transition-all duration-300 cursor-pointer group hover:scale-[1.02] hover:shadow-xl hover:shadow-black/40"
                onClick={() => playSunoTrack(track.id, track.title, track.artist, track.thumbnail)}
              >
                <div className="relative mb-4 aspect-square rounded-lg overflow-hidden bg-secondary shadow-lg transition-transform duration-300 group-hover:scale-105">
                  <Image
                    src={track.thumbnail || "/placeholder.svg"}
                    alt={track.title}
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                    unoptimized={true}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="icon"
                      className="bg-primary hover:bg-primary/90 hover:scale-105 text-white rounded-full h-12 w-12 shadow-lg shadow-primary/20 transition-all duration-300"
                      onClick={(e) => {
                        e.stopPropagation()
                        playSunoTrack(track.id, track.title, track.artist, track.thumbnail)
                      }}
                    >
                      <Play fill="currentColor" size={20} className="ml-1" />
                    </Button>
                  </div>
                </div>
                <h3 className="font-semibold text-sm mb-1 line-clamp-1">{track.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">{track.artist}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Access - Recently Played */}
        {recentPlaylists.length > 0 && (
          <section className="mb-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentPlaylists.map((playlist) => (
                <Card
                  key={playlist.id}
                  className="relative overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/40 border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl"
                  onClick={() => handleNavigateToPlaylist(playlist.id)}
                >
                  {/* Blurred background */}
                  <div 
                    className="absolute inset-0 z-0 opacity-40 bg-cover bg-center"
                    style={{ backgroundImage: `url(${playlist.coverImage || (playlist.tracks.length > 0 ? playlist.tracks[0].thumbnail : "/placeholder.svg")})`, filter: 'blur(20px)' }}
                  />
                  {/* Gradient overlay for readability */}
                  <div className="absolute inset-0 z-0 bg-gradient-to-r from-black/60 to-black/20" />
                  
                  <div className="relative z-10 flex items-center gap-4 p-0">
                    <div className="relative w-20 h-20 flex-shrink-0 bg-secondary/50 shadow-lg">
                      {playlist.coverImage || playlist.tracks.length > 0 ? (
                        <Image
                          src={playlist.coverImage || playlist.tracks[0].thumbnail || "/placeholder.svg"}
                          alt={playlist.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music2 size={32} className="text-white/50" />
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm md:text-base flex-1 line-clamp-2 text-white drop-shadow-md">{playlist.name}</h3>
                    <Button
                      size="icon"
                      className="bg-primary hover:bg-primary/90 hover:scale-105 text-white rounded-full h-12 w-12 opacity-0 group-hover:opacity-100 transition-all duration-300 mr-4 shadow-lg shadow-primary/20"
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePlayPlaylist(playlist.id)
                      }}
                      aria-label={`Play ${playlist.name}`}
                    >
                      <Play fill="currentColor" size={20} className="ml-1" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Made For You */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp size={28} className="text-primary" />
            <h2 className="text-4xl font-bold tracking-tight">Made For You</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {/* Liked Songs Card */}
            {likedSongs.length > 0 && (
              <div
                className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] backdrop-blur-xl rounded-xl p-4 transition-all duration-300 cursor-pointer group hover:scale-[1.02] hover:shadow-xl hover:shadow-black/40"
                onClick={() => onNavigate("liked")}
                role="button"
                tabIndex={0}
                aria-label="Play liked songs"
              >
                <div className="relative mb-4 aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105">
                  <Music2 size={64} className="text-white" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="icon"
                      className="bg-primary hover:bg-primary/90 hover:scale-105 text-white rounded-full h-12 w-12 shadow-lg shadow-primary/20 transition-all duration-300"
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePlayLikedSongs()
                      }}
                      aria-label="Play liked songs"
                    >
                      <Play fill="currentColor" size={20} className="ml-1" />
                    </Button>
                  </div>
                </div>
                <h3 className="font-semibold text-sm mb-1">Liked Songs</h3>
                <p className="text-xs text-muted-foreground">
                  {likedSongs.length} {likedSongs.length === 1 ? "song" : "songs"}
                </p>
              </div>
            )}

            {/* Your Playlists */}
            {playlists.slice(0, 4).map((playlist) => (
              <div
                key={playlist.id}
                className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] backdrop-blur-xl rounded-xl p-4 transition-all duration-300 cursor-pointer group hover:scale-[1.02] hover:shadow-xl hover:shadow-black/40"
                onClick={() => handleNavigateToPlaylist(playlist.id)}
                role="button"
                tabIndex={0}
                aria-label={`Open ${playlist.name} playlist`}
              >
                <div className="relative mb-4 aspect-square rounded-lg overflow-hidden bg-secondary flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105">
                  {playlist.coverImage || playlist.tracks.length > 0 ? (
                    <Image
                      src={playlist.coverImage || playlist.tracks[0].thumbnail || "/placeholder.svg"}
                      alt={playlist.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <Music2 size={48} className="text-muted-foreground" />
                  )}
                  {playlist.tracks.length > 0 && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        size="icon"
                        className="bg-primary hover:bg-primary/90 hover:scale-105 text-white rounded-full h-12 w-12 shadow-lg shadow-primary/20 transition-all duration-300"
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePlayPlaylist(playlist.id)
                        }}
                        aria-label={`Play ${playlist.name} playlist`}
                      >
                        <Play fill="currentColor" size={20} className="ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-sm mb-1 line-clamp-2">{playlist.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {playlist.tracks.length} {playlist.tracks.length === 1 ? "song" : "songs"}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Recently Played Tracks */}
        {recentlyPlayed.filter((item) => item.type === "track").length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Clock size={28} className="text-primary" />
              <h2 className="text-4xl font-bold tracking-tight">Recently Played</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {recentlyPlayed
                .filter((item) => item.type === "track")
                .slice(0, 5)
                .map((item) => {
                  // Find the track in playlists
                  let track = null
                  for (const playlist of playlists) {
                    track = playlist.tracks.find((t) => t.id === item.id)
                    if (track) break
                  }
                  if (!track) return null

                  return (
                    <div
                      key={item.id}
                      className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] backdrop-blur-xl rounded-xl p-4 transition-all duration-300 cursor-pointer group hover:scale-[1.02] hover:shadow-xl hover:shadow-black/40"
                      onClick={() => {
                        setCurrentTrack(track)
                        setQueue([])
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Play ${track.title}`}
                    >
                      <div className="relative mb-4 aspect-square rounded-lg overflow-hidden bg-secondary shadow-lg transition-transform duration-300 group-hover:scale-105">
                        <Image
                          src={track.thumbnail || "/placeholder.svg"}
                          alt={track.title}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            size="icon"
                            className="bg-primary hover:bg-primary/90 hover:scale-105 text-white rounded-full h-12 w-12 shadow-lg shadow-primary/20 transition-all duration-300"
                            onClick={(e) => {
                              e.stopPropagation()
                              setCurrentTrack(track)
                              setQueue([])
                            }}
                            aria-label={`Play ${track.title}`}
                          >
                            <Play fill="currentColor" size={20} className="ml-1" />
                          </Button>
                        </div>
                      </div>
                      <h3 className="font-semibold text-sm mb-1 line-clamp-2">{track.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">{track.artist}</p>
                    </div>
                  )
                })}
            </div>
          </section>
        )}

        {playlists.length === 0 && likedSongs.length === 0 && (
          <div className="text-center py-20">
            <Music2 size={64} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg md:text-xl text-muted-foreground mb-2">Welcome to Joelify!</p>
            <p className="text-sm text-muted-foreground">Search for music to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}
