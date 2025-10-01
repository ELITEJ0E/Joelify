"use client"

import type React from "react"

import { useState } from "react"
import { useApp } from "@/contexts/AppContext"
import { Play, MoreVertical, Trash2, GripVertical } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function PlaylistView() {
  const { playlists, currentPlaylistId, setCurrentTrack, setQueue, removeTrackFromPlaylist, reorderPlaylistTracks } =
    useApp()
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const currentPlaylist = playlists.find((p) => p.id === currentPlaylistId)

  if (!currentPlaylist) {
    return (
      <div className="flex-1 bg-gradient-to-b from-purple-900/20 to-background text-foreground p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground">No playlist selected</p>
            <p className="text-sm text-muted-foreground mt-2">Select a playlist from the sidebar</p>
          </div>
        </div>
      </div>
    )
  }

  const handlePlayPlaylist = () => {
    if (currentPlaylist.tracks.length === 0) return
    setCurrentTrack(currentPlaylist.tracks[0])
    setQueue(currentPlaylist.tracks.slice(1))
  }

  const handlePlayTrack = (index: number) => {
    setCurrentTrack(currentPlaylist.tracks[index])
    setQueue(currentPlaylist.tracks.slice(index + 1))
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newTracks = [...currentPlaylist.tracks]
    const draggedTrack = newTracks[draggedIndex]
    newTracks.splice(draggedIndex, 1)
    newTracks.splice(index, 0, draggedTrack)

    reorderPlaylistTracks(currentPlaylist.id, newTracks)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-purple-900/20 to-background text-foreground p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end gap-6 mb-8">
          <div className="w-52 h-52 bg-secondary rounded-lg flex items-center justify-center shadow-lg">
            {currentPlaylist.tracks.length > 0 ? (
              <Image
                src={currentPlaylist.tracks[0].thumbnail || "/placeholder.svg"}
                alt={currentPlaylist.name}
                width={208}
                height={208}
                className="rounded-lg"
              />
            ) : (
              <div className="text-8xl text-muted-foreground">♪</div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold uppercase">Playlist</p>
            <h1 className="text-5xl font-bold mt-2 mb-4 text-balance">{currentPlaylist.name}</h1>
            <p className="text-sm text-muted-foreground">
              {currentPlaylist.tracks.length} {currentPlaylist.tracks.length === 1 ? "song" : "songs"}
            </p>
          </div>
        </div>

        {currentPlaylist.tracks.length > 0 && (
          <>
            <div className="mb-8">
              <Button size="lg" className="bg-primary hover:bg-primary/90 rounded-full" onClick={handlePlayPlaylist}>
                <Play fill="currentColor" size={20} className="mr-2" />
                Play
              </Button>
            </div>

            <div className="space-y-2">
              {currentPlaylist.tracks.map((track, index) => (
                <div
                  key={`${track.id}-${index}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-4 p-3 rounded-md hover:bg-secondary/50 group cursor-move ${
                    draggedIndex === index ? "opacity-50" : ""
                  }`}
                >
                  <GripVertical size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100" />
                  <span className="text-sm text-muted-foreground w-8 text-center">{index + 1}</span>
                  <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => handlePlayTrack(index)}>
                    <Image
                      src={track.thumbnail || "/placeholder.svg"}
                      alt={track.title}
                      width={48}
                      height={48}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{track.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{track.artist}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">{track.duration}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => removeTrackFromPlaylist(currentPlaylist.id, track.id)}
                        className="text-destructive"
                      >
                        <Trash2 size={14} className="mr-2" />
                        Remove from playlist
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </>
        )}

        {currentPlaylist.tracks.length === 0 && (
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground mb-4">This playlist is empty</p>
            <p className="text-sm text-muted-foreground">Search for songs and add them to this playlist</p>
          </div>
        )}
      </div>
    </div>
  )
}
