"use client"

import { useState } from "react"
import { useApp } from "@/contexts/AppContext"
import { Play, Heart, MoreVertical, Plus } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function LikedSongsView() {
  const { 
    likedSongs, 
    setCurrentTrack, 
    setQueue, 
    toggleLikedSong,
    playlists,
    addTrackToPlaylist,
  } = useApp()
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [trackToUnlike, setTrackToUnlike] = useState<any>(null)
  const [selectedPlaylist, setSelectedPlaylist] = useState<Record<string, string>>({})

  const handlePlayAll = () => {
    if (likedSongs.length === 0) return
    setCurrentTrack(likedSongs[0])
    setQueue(likedSongs.slice(1))
  }

  const handlePlayTrack = (index: number) => {
    setCurrentTrack(likedSongs[index])
    setQueue(likedSongs.slice(index + 1))
  }

  const openDeleteDialog = (track: any) => {
    setTrackToUnlike(track)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmUnlike = () => {
    if (trackToUnlike) {
      toggleLikedSong(trackToUnlike)
    }
    setIsDeleteDialogOpen(false)
    setTrackToUnlike(null)
  }

  const handleAddToPlaylist = (track: any, playlistId: string) => {
    if (playlistId) {
      addTrackToPlaylist(playlistId, track)
    }
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-purple-600/20 to-background text-foreground p-4 md:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="w-full md:w-52 h-52 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg">
            <Heart size={80} fill="white" className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs md:text-sm font-semibold uppercase mb-1 md:mb-2">Playlist</p>
            <h1 className="text-3xl md:text-5xl font-bold mb-2 md:mb-4">Liked Songs</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              {likedSongs.length} {likedSongs.length === 1 ? "song" : "songs"}
            </p>
          </div>
        </div>

        {likedSongs.length > 0 && (
          <>
            <div className="mb-6 md:mb-8">
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 rounded-full h-12 md:h-14 px-6 md:px-8" 
                onClick={handlePlayAll}
              >
                <Play fill="currentColor" size={20} className="mr-2" />
                Play
              </Button>
            </div>

            <div className="space-y-1 md:space-y-2">
              {likedSongs.map((track, index) => (
                <div
                  key={`${track.id}-${index}`}
                  className="flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-md hover:bg-secondary/50 group transition-colors"
                >
                  <span className="text-xs md:text-sm text-muted-foreground w-6 md:w-8 text-center flex-shrink-0">{index + 1}</span>
                  <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => handlePlayTrack(index)}>
                    <Image
                      src={track.thumbnail || "/placeholder.svg"}
                      alt={track.title}
                      width={48}
                      height={48}
                      className="rounded w-10 h-10 md:w-12 md:h-12 flex-shrink-0 object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{track.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{track.artist}</p>
                    </div>
                  </div>
                  <span className="text-xs md:text-sm text-muted-foreground flex-shrink-0 hidden sm:block">{track.duration}</span>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-1">
                      <Select 
                        value={selectedPlaylist[track.id] || ""} 
                        onValueChange={(value) => {
                          setSelectedPlaylist({...selectedPlaylist, [track.id]: value})
                          handleAddToPlaylist(track, value)
                        }}
                      >
                        <SelectTrigger className="h-8 w-8 p-0 border-none bg-transparent hover:bg-secondary">
                          <Plus size={16} className="mx-auto" />
                        </SelectTrigger>
                        <SelectContent>
                          {playlists.map((playlist) => (
                            <SelectItem key={playlist.id} value={playlist.id} className="text-xs">
                              {playlist.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 flex-shrink-0"
                        >
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(track)}
                          className="text-destructive"
                        >
                          <Heart size={14} className="mr-2" />
                          Remove from Liked Songs
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {likedSongs.length === 0 && (
          <div className="text-center py-20">
            <Heart size={64} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg md:text-xl text-muted-foreground mb-4">No liked songs yet</p>
            <p className="text-sm text-muted-foreground">
              Songs you like will appear here. Start by searching for music!
            </p>
          </div>
        )}
      </div>

      {/* Unlike Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove from Liked Songs</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this song from your liked songs?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmUnlike}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
