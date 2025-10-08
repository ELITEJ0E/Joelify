"use client"

import { useApp } from "@/contexts/AppContext"
import { Play, Music2 } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function LibraryView() {
  const { playlists, likedSongs, setCurrentPlaylistId, setCurrentTrack, setQueue, addRecentlyPlayed } = useApp()

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

  const totalTracks = playlists.reduce((acc, p) => acc + p.tracks.length, 0)

  return (
    <div className="flex-1 bg-gradient-to-b from-purple-900/20 to-background text-foreground p-4 md:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Your Library</h1>
        <p className="text-muted-foreground mb-8">
          {playlists.length} {playlists.length === 1 ? "playlist" : "playlists"} • {totalTracks}{" "}
          {totalTracks === 1 ? "song" : "songs"}
        </p>

        {/* Liked Songs Card */}
        {likedSongs.length > 0 && (
          <Card className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-none p-6 mb-8 hover:scale-[1.02] transition-transform cursor-pointer group">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Music2 size={48} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold mb-1">Liked Songs</h2>
                <p className="text-muted-foreground">
                  {likedSongs.length} {likedSongs.length === 1 ? "song" : "songs"}
                </p>
              </div>
              <Button
                size="icon"
                className="bg-primary hover:bg-primary/90 rounded-full h-14 w-14 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handlePlayLikedSongs}
                aria-label="Play liked songs"
              >
                <Play fill="currentColor" size={24} />
              </Button>
            </div>
          </Card>
        )}

        {/* Playlists Grid */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold mb-6">Playlists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="bg-card hover:bg-card/80 rounded-lg p-4 transition-all cursor-pointer group hover:scale-[1.02]"
                onClick={() => setCurrentPlaylistId(playlist.id)}
                role="button"
                tabIndex={0}
                aria-label={`Open ${playlist.name} playlist`}
              >
                <div className="relative mb-4 aspect-square rounded-md overflow-hidden bg-secondary flex items-center justify-center">
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
                        className="bg-primary hover:bg-primary/90 rounded-full h-12 w-12"
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePlayPlaylist(playlist.id)
                        }}
                        aria-label={`Play ${playlist.name} playlist`}
                      >
                        <Play fill="currentColor" size={20} />
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

        {playlists.length === 0 && likedSongs.length === 0 && (
          <div className="text-center py-20">
            <Music2 size={64} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg md:text-xl text-muted-foreground mb-2">Your library is empty</p>
            <p className="text-sm text-muted-foreground">Create playlists and like songs to build your collection!</p>
          </div>
        )}
      </div>
    </div>
  )
}
