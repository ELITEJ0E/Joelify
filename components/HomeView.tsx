"use client"

import { useApp } from "@/contexts/AppContext"
import { Play } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"

export function HomeView() {
  const { playlists, currentPlaylistId, setCurrentPlaylistId, setCurrentTrack, setQueue, addRecentlyPlayed } = useApp()

  const handlePlayPlaylist = (playlistId: string) => {
    const playlist = playlists.find((p) => p.id === playlistId)
    if (!playlist || playlist.tracks.length === 0) return

    setCurrentPlaylistId(playlistId)
    setCurrentTrack(playlist.tracks[0])
    setQueue(playlist.tracks.slice(1))
    addRecentlyPlayed({ type: "playlist", id: playlistId })
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-blue-900/20 to-background text-foreground p-4 md:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 md:mb-8">Home</h1>

        <section className="mb-12">
          <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Your Playlists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="bg-card list-hover-green hover-scale-smaller rounded-lg p-3 md:p-4 transition-all cursor-pointer group"
                onClick={() => setCurrentPlaylistId(playlist.id)}
                role="button"
                tabIndex={0}
                aria-label={`Open ${playlist.name} playlist`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setCurrentPlaylistId(playlist.id)
                  }
                }}
              >
                <div className="relative mb-3 md:mb-4 aspect-square rounded-md overflow-hidden bg-secondary flex items-center justify-center">
                  {playlist.coverImage || playlist.tracks.length > 0 ? (
                    <Image
                      src={playlist.coverImage || playlist.tracks[0].thumbnail || "/placeholder.svg"}
                      alt={playlist.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="text-4xl md:text-6xl text-muted-foreground">♪</div>
                  )}
                  {playlist.tracks.length > 0 && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        size="icon"
                        className="bg-primary hover:bg-primary/90 rounded-full h-10 w-10 md:h-12 md:w-12"
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
                <h3 className="font-semibold text-sm mb-1 line-clamp-1">{playlist.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {playlist.tracks.length} {playlist.tracks.length === 1 ? "song" : "songs"}
                </p>
              </div>
            ))}
          </div>
        </section>

        {playlists.length === 0 && (
          <div className="text-center py-20">
            <p className="text-lg md:text-xl text-muted-foreground mb-4">No playlists yet</p>
            <p className="text-sm text-muted-foreground">Create a playlist and start adding songs!</p>
          </div>
        )}
      </div>
    </div>
  )
}
