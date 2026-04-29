"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useApp } from "@/contexts/AppContext"
import { Play, MoreVertical, Trash2, GripVertical, Plus, Edit } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ShareMenu } from "./ShareMenu"

export function PlaylistView() {
  const {
    playlists,
    currentPlaylistId,
    setCurrentTrack,
    setQueue,
    removeTrackFromPlaylist,
    reorderPlaylistTracks,
    addTrackToPlaylist,
    updatePlaylistCover,
    updatePlaylistDescription,
    addRecentlyPlayed,
  } = useApp()
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [trackToRemove, setTrackToRemove] = useState<{ playlistId: string; trackId: string } | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [newThumbnail, setNewThumbnail] = useState<File | null>(null)
  const [newDescription, setNewDescription] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [base64Image, setBase64Image] = useState<string | null>(null)
  const [selectedPlaylist, setSelectedPlaylist] = useState<Record<string, string>>({})

  const currentPlaylist = playlists.find((p) => p.id === currentPlaylistId)

  // Handle image preview and base64 conversion
  useEffect(() => {
    if (newThumbnail) {
      const url = URL.createObjectURL(newThumbnail)
      setPreviewUrl(url)

      // Convert to base64 for persistence
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setBase64Image(reader.result)
        }
      }
      reader.readAsDataURL(newThumbnail)

      return () => URL.revokeObjectURL(url) // Clean up blob URL
    } else {
      setPreviewUrl(null)
      setBase64Image(null)
    }
  }, [newThumbnail])

  if (!currentPlaylist) {
    return (
      <div className="flex-1 bg-gradient-to-b from-[hsl(var(--primary)/0.06)] to-transparent text-foreground p-3 sm:p-8 overflow-y-auto">
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
    addRecentlyPlayed({ type: "playlist", id: currentPlaylist.id })
  }

  const handlePlayTrack = (index: number) => {
    setCurrentTrack(currentPlaylist.tracks[index])
    setQueue(currentPlaylist.tracks.slice(index + 1))
    addRecentlyPlayed({ type: "track", id: currentPlaylist.tracks[index].id })
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

  const openRemoveDialog = (playlistId: string, trackId: string) => {
    setTrackToRemove({ playlistId, trackId })
    setIsRemoveDialogOpen(true)
  }

  const handleRemoveTrack = () => {
    if (trackToRemove) {
      removeTrackFromPlaylist(trackToRemove.playlistId, trackToRemove.trackId)
      setIsRemoveDialogOpen(false)
      setTrackToRemove(null)
    }
  }

  const handleAddToPlaylist = (track: any, playlistId: string) => {
    if (playlistId) {
      addTrackToPlaylist(playlistId, track)
    }
  }

  const handleEditPlaylist = () => {
    setNewDescription(currentPlaylist.description || "")
    setNewThumbnail(null)
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = () => {
    if (base64Image) {
      updatePlaylistCover(currentPlaylist.id, base64Image)
    }
    if (newDescription !== currentPlaylist.description) {
      updatePlaylistDescription(currentPlaylist.id, newDescription)
    }
    setIsEditDialogOpen(false)
    setNewThumbnail(null)
    setNewDescription("")
    setBase64Image(null)
  }

  const handleClearImage = () => {
    setNewThumbnail(null)
    setPreviewUrl(null)
    setBase64Image(null)
    updatePlaylistCover(currentPlaylist.id, "") // Reset coverImage to empty string
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-[hsl(var(--primary)/0.06)] to-transparent text-foreground p-3 sm:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end gap-6 mb-8">
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <div
                className="w-64 h-64 bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl rounded-lg flex items-center justify-center shadow-2xl cursor-pointer hover:scale-[1.02] transition-transform duration-300 relative group"
                onClick={handleEditPlaylist}
              >
                {currentPlaylist.coverImage || currentPlaylist.tracks.length > 0 ? (
                  <Image
                    src={currentPlaylist.coverImage || currentPlaylist.tracks[0].thumbnail || "/placeholder.svg"}
                    alt={currentPlaylist.name}
                    width={256}
                    height={256}
                    className="rounded-lg object-cover"
                  />
                ) : (
                  <div className="text-8xl text-muted-foreground">♪</div>
                )}
                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-80 transition-opacity">
                  <Edit size={27} className="text-white" />
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-black/80 backdrop-blur-2xl border-white/[0.07]">
              <DialogHeader>
                <DialogTitle>Edit Playlist</DialogTitle>
                <DialogDescription>Update the playlist's image and description.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Playlist Image</label>
                  <div className="mt-2 flex items-center gap-2">
                    {previewUrl || currentPlaylist.coverImage ? (
                      <Image
                        src={previewUrl || currentPlaylist.coverImage || "/placeholder.svg"}
                        alt="Playlist preview"
                        width={128}
                        height={128}
                        className="rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-secondary rounded-lg flex items-center justify-center">
                        <span className="text-4xl text-muted-foreground">♪</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNewThumbnail(e.target.files?.[0] || null)}
                    />
                    {(previewUrl || currentPlaylist.coverImage) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClearImage}
                        className="text-destructive hover:bg-destructive"
                      >
                        <Trash2 size={20} />
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Enter a description for your playlist"
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <div className="flex-1">
            <p className="text-sm font-semibold uppercase">Playlist</p>
            <h1 className="text-5xl font-bold mt-2 mb-2 text-balance">{currentPlaylist.name}</h1>
            {currentPlaylist.description && (
              <p className="text-sm text-muted-foreground mb-4">{currentPlaylist.description}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {currentPlaylist.tracks.length} {currentPlaylist.tracks.length === 1 ? "song" : "songs"}
            </p>
          </div>
        </div>

        {currentPlaylist.tracks.length > 0 && (
          <>
            <div className="mb-8 flex items-center gap-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90 rounded-full" onClick={handlePlayPlaylist}>
                <Play fill="currentColor" size={20} className="mr-2" />
                Play
              </Button>
              <ShareMenu type="playlist" data={currentPlaylist} />
            </div>

            <div className="space-y-2">
              {currentPlaylist.tracks.map((track, index) => (
                <div
                  key={`${track.id}-${index}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-md hover:bg-primary/15 transition-colors group cursor-move ${
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
                        className="transition-opacity"
                      >
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <Select
                        value={selectedPlaylist[track.id] || ""}
                        onValueChange={(value) => {
                          setSelectedPlaylist({ ...selectedPlaylist, [track.id]: value })
                          handleAddToPlaylist(track, value)
                        }}
                      >
                        <SelectTrigger className="h-8 w-full border-none bg-transparent hover:bg-secondary">
                          <div className="flex items-center gap-2">
                            <Plus size={14} />
                            Add to Playlist
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {playlists
                            .filter((p) => p.id !== currentPlaylist.id)
                            .map((playlist) => (
                              <SelectItem key={playlist.id} value={playlist.id} className="text-sm">
                                {playlist.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
                        <DialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            onClick={() => openRemoveDialog(currentPlaylist.id, track.id)}
                            className="text-destructive"
                          >
                            <Trash2 size={14} className="mr-2" />
                            Remove from playlist
                          </DropdownMenuItem>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Remove Track</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to remove {track.title} from {currentPlaylist.name}?
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsRemoveDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleRemoveTrack} className="bg-destructive hover:bg-destructive/90">
                              Remove
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
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
