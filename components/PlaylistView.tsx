"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useApp } from "@/contexts/AppContext"
import {
  Play,
  Pause,
  Shuffle,
  MoreVertical,
  Trash2,
  GripVertical,
  Plus,
  Edit2,
  Music2,
  Heart,
  ListPlus,
  Share2,
  Clock,
  Search,
  Sparkles,
  Volume2,
  Check,
  Disc3,
  ImagePlus,
} from "lucide-react"
import { TrackImage as Image } from "./TrackImage"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ShareMenu } from "./ShareMenu"
import type { Track } from "@/lib/storage"

interface PlaylistViewProps {
  onNavigate?: (view: any, params?: any) => void
  onOpenSidebar?: () => void
}

function parseDurationToSeconds(durationStr?: string): number {
  if (!durationStr) return 0
  const parts = durationStr.split(":").map(Number)
  if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0)
  if (parts.length === 3) return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0)
  return 0
}

function formatTotalDuration(seconds: number): string {
  if (seconds <= 0) return ""
  const mins = Math.floor(seconds / 60)
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  if (hours > 0) {
    return `${hours} hr ${remainingMins} min`
  }
  return `${mins} min`
}

export function PlaylistView({ onNavigate, onOpenSidebar }: PlaylistViewProps) {
  const {
    playlists,
    currentPlaylistId,
    setCurrentPlaylistId,
    currentTrack,
    setCurrentTrack,
    setQueue,
    addToQueue,
    removeTrackFromPlaylist,
    reorderPlaylistTracks,
    addTrackToPlaylist,
    updatePlaylistCover,
    updatePlaylistDescription,
    renamePlaylist,
    deletePlaylist,
    addRecentlyPlayed,
    toggleLikedSong,
    isTrackLiked,
    setPlaybackSource,
  } = useApp()

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [trackToRemove, setTrackToRemove] = useState<{ playlistId: string; trackId: string; title: string } | null>(null)
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newThumbnail, setNewThumbnail] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [base64Image, setBase64Image] = useState<string | null>(null)
  const [selectedPlaylist, setSelectedPlaylist] = useState<Record<string, string>>({})

  const currentPlaylist = playlists.find((p) => p.id === currentPlaylistId)

  // Handle image preview and base64 conversion
  useEffect(() => {
    if (newThumbnail) {
      const url = URL.createObjectURL(newThumbnail)
      setPreviewUrl(url)

      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setBase64Image(reader.result)
        }
      }
      reader.readAsDataURL(newThumbnail)

      return () => URL.revokeObjectURL(url)
    } else {
      setPreviewUrl(null)
      setBase64Image(null)
    }
  }, [newThumbnail])

  // Calculate total playlist duration
  const totalDurationText = useMemo(() => {
    if (!currentPlaylist || currentPlaylist.tracks.length === 0) return ""
    const totalSeconds = currentPlaylist.tracks.reduce((acc, t) => acc + parseDurationToSeconds(t.duration), 0)
    return formatTotalDuration(totalSeconds)
  }, [currentPlaylist])

  if (!currentPlaylist) {
    return (
      <div className="flex-1 bg-gradient-to-b from-zinc-900/90 via-black/95 to-black text-foreground p-4 sm:p-8 pb-32 sm:pb-36 overflow-y-auto min-h-full">
        <div className="max-w-4xl mx-auto text-center py-20 space-y-4">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-zinc-900 border border-white/10 flex items-center justify-center text-muted-foreground shadow-2xl">
            <Disc3 size={36} className="text-gray-400 animate-spin-slow" />
          </div>
          <h2 className="text-2xl font-bold text-white">No Playlist Selected</h2>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            Choose a playlist from your library or explore new music to create one.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            {onNavigate && (
              <Button
                onClick={() => onNavigate("search")}
                className="bg-primary text-primary-foreground font-semibold rounded-full px-5 shadow-lg"
              >
                <Search size={16} className="mr-2" />
                Explore Songs
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const handlePlayPlaylist = () => {
    if (currentPlaylist.tracks.length === 0) return
    setPlaybackSource("youtube")
    setCurrentTrack(currentPlaylist.tracks[0])
    setQueue(currentPlaylist.tracks.slice(1))
    addRecentlyPlayed({ type: "playlist", id: currentPlaylist.id })
  }

  const handleShufflePlaylist = () => {
    if (currentPlaylist.tracks.length === 0) return
    setPlaybackSource("youtube")
    const shuffled = [...currentPlaylist.tracks].sort(() => Math.random() - 0.5)
    setCurrentTrack(shuffled[0])
    setQueue(shuffled.slice(1))
    addRecentlyPlayed({ type: "playlist", id: currentPlaylist.id })
  }

  const handlePlayTrack = (index: number) => {
    setPlaybackSource("youtube")
    setCurrentTrack(currentPlaylist.tracks[index])
    setQueue(currentPlaylist.tracks.slice(index + 1))
    addRecentlyPlayed({ type: "track", id: currentPlaylist.tracks[index].id })
  }

  const handleAddAllToQueue = () => {
    if (currentPlaylist.tracks.length === 0) return
    for (const track of currentPlaylist.tracks) {
      addToQueue(track)
    }
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

  const openRemoveDialog = (playlistId: string, trackId: string, title: string) => {
    setTrackToRemove({ playlistId, trackId, title })
    setIsRemoveDialogOpen(true)
  }

  const handleConfirmRemoveTrack = () => {
    if (trackToRemove) {
      removeTrackFromPlaylist(trackToRemove.playlistId, trackToRemove.trackId)
      setIsRemoveDialogOpen(false)
      setTrackToRemove(null)
    }
  }

  const handleAddToPlaylist = (track: Track, playlistId: string) => {
    if (playlistId) {
      addTrackToPlaylist(playlistId, track)
    }
  }

  const handleOpenEdit = () => {
    setNewName(currentPlaylist.name || "")
    setNewDescription(currentPlaylist.description || "")
    setNewThumbnail(null)
    setPreviewUrl(null)
    setBase64Image(null)
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = () => {
    if (newName.trim() && newName.trim() !== currentPlaylist.name) {
      renamePlaylist(currentPlaylist.id, newName.trim())
    }
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

  const handleClearCoverImage = () => {
    setNewThumbnail(null)
    setPreviewUrl(null)
    setBase64Image(null)
    updatePlaylistCover(currentPlaylist.id, "")
  }

  const handleDeletePlaylist = () => {
    deletePlaylist(currentPlaylist.id)
    setIsDeleteDialogOpen(false)
    if (onNavigate) {
      onNavigate("library")
    }
  }

  const isCurrentPlaylistPlaying =
    currentTrack && currentPlaylist.tracks.some((t) => t.id === currentTrack.id)

  const coverUrl =
    currentPlaylist.coverImage ||
    (currentPlaylist.tracks.length > 0 ? currentPlaylist.tracks[0].thumbnail : null)

  return (
    <div className="flex-1 bg-gradient-to-b from-zinc-900/90 via-black/95 to-black text-foreground p-3.5 sm:p-6 md:p-8 pb-32 sm:pb-36 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        
        {/* HERO HEADER - Sleek, Responsive, Compact Thumbnail */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 sm:gap-6 md:gap-8 pt-2 pb-6 border-b border-white/[0.08]">
          
          {/* Thumbnail Container */}
          <div
            onClick={handleOpenEdit}
            className="w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 lg:w-52 lg:h-52 shrink-0 rounded-2xl overflow-hidden shadow-2xl bg-zinc-900 ring-1 ring-white/10 relative group cursor-pointer transition-all duration-300 hover:scale-[1.02]"
            title="Click to edit playlist image and details"
          >
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt={currentPlaylist.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 144px, (max-width: 768px) 176px, 208px"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 text-gray-400">
                <Music2 size={48} className="text-gray-500 mb-1" />
                <span className="text-[11px] font-medium text-gray-500">Add Cover</span>
              </div>
            )}

            {/* Hover Edit Overlay */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Edit2 size={22} className="text-white" />
              <span className="text-xs font-semibold text-white">Edit Cover</span>
            </div>
          </div>

          {/* Playlist Info & Metadata */}
          <div className="flex-1 text-center sm:text-left space-y-2.5 sm:space-y-3 min-w-0 w-full">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase bg-primary/20 text-primary px-2.5 py-0.5 rounded-full border border-primary/30">
                Playlist
              </span>
              {currentPlaylist.tracks.length > 0 && (
                <span className="text-xs text-gray-400 font-medium">
                  • Public
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight line-clamp-2">
              {currentPlaylist.name}
            </h1>

            {currentPlaylist.description && (
              <p className="text-xs sm:text-sm text-gray-400 line-clamp-2 max-w-2xl">
                {currentPlaylist.description}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-gray-300 pt-0.5">
              <span className="font-semibold text-white">
                {currentPlaylist.tracks.length} {currentPlaylist.tracks.length === 1 ? "track" : "tracks"}
              </span>
              {totalDurationText && (
                <>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">{totalDurationText}</span>
                </>
              )}
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-2">
              <Button
                onClick={handlePlayPlaylist}
                disabled={currentPlaylist.tracks.length === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 sm:px-6 h-11 rounded-full gap-2 shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <Play size={18} fill="currentColor" />
                <span>Play</span>
              </Button>

              <Button
                variant="outline"
                onClick={handleShufflePlaylist}
                disabled={currentPlaylist.tracks.length === 0}
                className="border-white/15 bg-zinc-900/90 hover:bg-zinc-800 text-white rounded-full h-11 px-4 gap-2 text-xs font-semibold cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Shuffle size={16} />
                <span>Shuffle</span>
              </Button>

              <Button
                variant="outline"
                onClick={handleOpenEdit}
                className="border-white/15 bg-zinc-900/90 hover:bg-zinc-800 text-gray-300 hover:text-white rounded-full h-11 px-3.5 gap-1.5 text-xs font-semibold cursor-pointer"
                title="Edit playlist name, description, and cover"
              >
                <Edit2 size={15} />
                <span className="hidden sm:inline">Edit</span>
              </Button>

              <ShareMenu type="playlist" data={currentPlaylist} />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="border border-white/10 bg-zinc-900/60 hover:bg-zinc-800 text-gray-300 hover:text-white rounded-full h-11 w-11 p-0 cursor-pointer"
                  >
                    <MoreVertical size={17} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border-white/10 text-white">
                  <DropdownMenuItem onClick={handleAddAllToQueue} className="cursor-pointer gap-2 text-xs">
                    <ListPlus size={15} />
                    <span>Add all to queue</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleOpenEdit} className="cursor-pointer gap-2 text-xs">
                    <Edit2 size={15} />
                    <span>Edit details</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="cursor-pointer gap-2 text-xs text-destructive hover:text-destructive focus:text-destructive"
                  >
                    <Trash2 size={15} />
                    <span>Delete playlist</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* TRACKS LIST */}
        {currentPlaylist.tracks.length > 0 ? (
          <div className="space-y-2">
            
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-white/5">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-6">Title</div>
              <div className="col-span-3">Artist</div>
              <div className="col-span-1 text-center flex items-center justify-center">
                <Clock size={14} />
              </div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {/* Track Rows */}
            <div className="space-y-1 sm:space-y-1.5">
              {currentPlaylist.tracks.map((track, index) => {
                const isPlaying = currentTrack?.id === track.id
                const isLiked = isTrackLiked(track.id)

                return (
                  <div
                    key={`${track.id}-${index}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-xl transition-all duration-150 group select-none ${
                      isPlaying
                        ? "bg-primary/15 border border-primary/25"
                        : "bg-zinc-900/40 hover:bg-zinc-800/80 border border-transparent"
                    } ${draggedIndex === index ? "opacity-40 scale-[0.99]" : ""}`}
                  >
                    {/* Drag Handle */}
                    <div
                      className="hidden sm:flex items-center justify-center text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1"
                      title="Drag to reorder"
                    >
                      <GripVertical size={16} />
                    </div>

                    {/* Track Index / Play Indicator */}
                    <button
                      type="button"
                      onClick={() => handlePlayTrack(index)}
                      className="w-7 sm:w-8 h-7 sm:h-8 flex items-center justify-center text-xs font-semibold text-gray-400 group-hover:text-white shrink-0 cursor-pointer rounded-lg hover:bg-white/10"
                    >
                      {isPlaying ? (
                        <Volume2 size={16} className="text-primary animate-pulse" />
                      ) : (
                        <>
                          <span className="group-hover:hidden">{index + 1}</span>
                          <Play size={14} fill="currentColor" className="hidden group-hover:block text-white ml-0.5" />
                        </>
                      )}
                    </button>

                    {/* Thumbnail & Title Area */}
                    <div
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => handlePlayTrack(index)}
                    >
                      <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden shrink-0 bg-zinc-800 ring-1 ring-white/10">
                        <Image
                          src={track.thumbnail || "/placeholder.svg"}
                          alt={track.title}
                          fill
                          className="object-cover"
                          sizes="44px"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-semibold text-xs sm:text-sm truncate ${
                            isPlaying ? "text-primary font-bold" : "text-white group-hover:text-primary transition-colors"
                          }`}
                        >
                          {track.title}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {track.artist}
                        </p>
                      </div>
                    </div>

                    {/* Like Heart Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleLikedSong(track)
                      }}
                      className={`p-2 rounded-full transition-all shrink-0 cursor-pointer ${
                        isLiked
                          ? "text-primary"
                          : "text-gray-500 hover:text-white opacity-60 sm:opacity-0 group-hover:opacity-100 hover:bg-white/10"
                      }`}
                      title={isLiked ? "Remove from Liked Songs" : "Save to Liked Songs"}
                    >
                      <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
                    </button>

                    {/* Duration */}
                    <span className="text-xs text-gray-400 font-mono shrink-0 hidden sm:inline-block w-12 text-right">
                      {track.duration || "--:--"}
                    </span>

                    {/* Track Actions Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 rounded-full shrink-0 cursor-pointer"
                        >
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 bg-zinc-900 border-white/10 text-white shadow-2xl">
                        <DropdownMenuItem
                          onClick={() => handlePlayTrack(index)}
                          className="cursor-pointer gap-2 text-xs"
                        >
                          <Play size={14} />
                          <span>Play now</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => addToQueue(track)}
                          className="cursor-pointer gap-2 text-xs"
                        >
                          <ListPlus size={14} />
                          <span>Add to queue</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleLikedSong(track)}
                          className="cursor-pointer gap-2 text-xs"
                        >
                          <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
                          <span>{isLiked ? "Remove from liked" : "Save to liked"}</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="bg-white/10" />

                        {/* Add to another playlist sub-action */}
                        <div className="p-1">
                          <Select
                            value={selectedPlaylist[track.id] || ""}
                            onValueChange={(value) => {
                              setSelectedPlaylist({ ...selectedPlaylist, [track.id]: value })
                              handleAddToPlaylist(track, value)
                            }}
                          >
                            <SelectTrigger className="h-8 w-full border-none bg-white/5 hover:bg-white/10 text-xs text-gray-300 rounded-lg justify-start gap-2">
                              <Plus size={14} />
                              <span className="truncate">Add to another playlist</span>
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10 text-white">
                              {playlists
                                .filter((p) => p.id !== currentPlaylist.id)
                                .map((playlist) => (
                                  <SelectItem key={playlist.id} value={playlist.id} className="text-xs">
                                    {playlist.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <DropdownMenuSeparator className="bg-white/10" />

                        <DropdownMenuItem
                          onClick={() => openRemoveDialog(currentPlaylist.id, track.id, track.title)}
                          className="cursor-pointer gap-2 text-xs text-destructive hover:text-destructive focus:text-destructive"
                        >
                          <Trash2 size={14} />
                          <span>Remove from playlist</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* EMPTY PLAYLIST STATE */
          <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-white/10 flex items-center justify-center mx-auto text-gray-400 shadow-xl">
              <Music2 size={32} className="text-gray-500" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">This playlist is empty</h3>
              <p className="text-xs sm:text-sm text-gray-400">
                Search for your favorite tracks and add them to this playlist.
              </p>
            </div>
            {onNavigate && (
              <div className="pt-2">
                <Button
                  onClick={() => onNavigate("search")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full px-5 text-xs h-10 shadow-lg shadow-primary/20 cursor-pointer"
                >
                  <Search size={14} className="mr-1.5" />
                  Explore Songs
                </Button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* EDIT PLAYLIST MODAL */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md bg-zinc-950/95 backdrop-blur-2xl border-white/10 text-white rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Edit2 size={18} className="text-primary" />
              Edit Playlist Details
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Customize your playlist name, cover artwork, and description.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            
            {/* Playlist Title */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5">Playlist Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My Awesome Playlist"
                className="bg-zinc-900 border-white/10 text-white rounded-xl text-sm focus:ring-primary h-11"
              />
            </div>

            {/* Playlist Artwork */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5">Playlist Artwork</label>
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 shrink-0 flex items-center justify-center">
                  {previewUrl || currentPlaylist.coverImage ? (
                    <Image
                      src={previewUrl || currentPlaylist.coverImage || "/placeholder.svg"}
                      alt="Playlist preview"
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <div className="text-center text-gray-500">
                      <ImagePlus size={24} className="mx-auto mb-1 opacity-60" />
                      <span className="text-[10px]">No Image</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewThumbnail(e.target.files?.[0] || null)}
                    className="text-xs bg-zinc-900 border-white/10 file:text-white file:bg-zinc-800 file:border-0 file:rounded-lg file:text-xs file:px-2 file:py-1 cursor-pointer"
                  />
                  {(previewUrl || currentPlaylist.coverImage) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearCoverImage}
                      className="text-xs text-destructive hover:bg-destructive/10 h-8 px-2.5 gap-1.5"
                    >
                      <Trash2 size={13} />
                      Remove Artwork
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5">Description (optional)</label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Give your playlist a catchy description..."
                rows={3}
                className="bg-zinc-900 border-white/10 text-white rounded-xl text-xs focus:ring-primary resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsEditDialogOpen(false)}
              className="text-xs rounded-xl hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs rounded-xl px-5 shadow-md"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM REMOVE TRACK MODAL */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent className="max-w-sm bg-zinc-950 border-white/10 text-white rounded-2xl p-5 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">Remove Track?</DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Are you sure you want to remove{" "}
              <span className="text-white font-medium">"{trackToRemove?.title}"</span> from this playlist?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsRemoveDialogOpen(false)}
              className="text-xs rounded-xl hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmRemoveTrack}
              className="bg-destructive hover:bg-destructive/90 text-white font-semibold text-xs rounded-xl"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE PLAYLIST MODAL */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm bg-zinc-950 border-white/10 text-white rounded-2xl p-5 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <Trash2 size={16} />
              Delete Playlist
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Are you sure you want to delete <span className="text-white font-medium">"{currentPlaylist.name}"</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="text-xs rounded-xl hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDeletePlaylist}
              className="bg-destructive hover:bg-destructive/90 text-white font-semibold text-xs rounded-xl"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
