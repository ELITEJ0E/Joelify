"use client"

import { useState } from "react"
import { Home, Search, Library, PlusSquare, Heart, MoreVertical, Edit2, Trash2, Sun, Moon, X } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useApp } from "@/contexts/AppContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface SidebarProps {
  onNavigate: (view: "home" | "search" | "playlist" | "liked") => void
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ onNavigate, isOpen, onClose }: SidebarProps) {
  const {
    playlists,
    currentPlaylistId,
    setCurrentPlaylistId,
    addPlaylist,
    deletePlaylist,
    renamePlaylist,
    theme,
    setTheme,
    likedSongs,
  } = useApp()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [renamePlaylistId, setRenamePlaylistId] = useState<string | null>(null)
  const [renamePlaylistName, setRenamePlaylistName] = useState("")

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      addPlaylist(newPlaylistName.trim())
      setNewPlaylistName("")
      setIsCreateDialogOpen(false)
    }
  }

  const handleRenamePlaylist = () => {
    if (renamePlaylistId && renamePlaylistName.trim()) {
      renamePlaylist(renamePlaylistId, renamePlaylistName.trim())
      setRenamePlaylistId(null)
      setRenamePlaylistName("")
      setIsRenameDialogOpen(false)
    }
  }

  const handleDeletePlaylist = (id: string) => {
    if (confirm("Are you sure you want to delete this playlist?")) {
      deletePlaylist(id)
    }
  }

  const openRenameDialog = (id: string, currentName: string) => {
    setRenamePlaylistId(id)
    setRenamePlaylistName(currentName)
    setIsRenameDialogOpen(true)
  }

  const handlePlaylistClick = (id: string) => {
    setCurrentPlaylistId(id)
    onNavigate("playlist")
    onClose()
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const handleNavigate = (view: "home" | "search" | "playlist" | "liked") => {
    onNavigate(view)
    onClose()
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} aria-hidden="true" />}

      <div
        className={`fixed lg:relative inset-y-0 left-0 z-50 w-60 bg-black text-gray-300 flex flex-col border-r border-border transform transition-transform duration-300 lg:transform-none ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-primary">Joelify</h1>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleTheme}
                className="text-gray-400 hover:text-white h-8 w-8"
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                className="text-gray-400 hover:text-white h-8 w-8 lg:hidden"
                aria-label="Close menu"
              >
                <X size={18} />
              </Button>
            </div>
          </div>
          <nav>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => handleNavigate("home")}
                  className="flex items-center space-x-3 hover:text-white w-full text-left transition-colors"
                  aria-label="Go to home"
                >
                  <Home size={24} />
                  <span>Home</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigate("search")}
                  className="flex items-center space-x-3 hover:text-white w-full text-left transition-colors"
                  aria-label="Go to search"
                >
                  <Search size={24} />
                  <span>Search</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigate("home")}
                  className="flex items-center space-x-3 hover:text-white w-full text-left transition-colors"
                  aria-label="Go to your library"
                >
                  <Library size={24} />
                  <span>Your Library</span>
                </button>
              </li>
            </ul>
          </nav>
          <div className="mt-8 space-y-4">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center space-x-3 hover:text-white w-full text-left transition-colors">
                  <PlusSquare size={24} />
                  <span>Create Playlist</span>
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Playlist</DialogTitle>
                  <DialogDescription>Give your playlist a name to get started.</DialogDescription>
                </DialogHeader>
                <Input
                  placeholder="My Playlist"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreatePlaylist()}
                  aria-label="Playlist name"
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreatePlaylist} disabled={!newPlaylistName.trim()}>
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <button 
              onClick={() => handleNavigate("liked")}
              className="flex items-center space-x-3 hover:text-white w-full text-left transition-colors relative"
            >
              <Heart size={24} />
              <span>Liked Songs</span>
              {likedSongs.length > 0 && (
                <span className="ml-auto text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                  {likedSongs.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="px-6 pb-6">
              <h2 className="text-xs uppercase font-semibold mb-4 text-gray-400">Playlists</h2>
              <ul className="space-y-1">
                {playlists.map((playlist) => (
                  <li key={playlist.id} className="group">
                    <div
                      className={`flex items-center justify-between py-2 px-2 rounded hover:bg-white/10 cursor-pointer transition-colors ${
                        currentPlaylistId === playlist.id ? "bg-white/10 text-white" : ""
                      }`}
                    >
                      <button onClick={() => handlePlaylistClick(playlist.id)} className="flex-1 text-left truncate">
                        {playlist.name}
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Playlist options"
                          >
                            <MoreVertical size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openRenameDialog(playlist.id, playlist.name)}>
                            <Edit2 size={14} className="mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeletePlaylist(playlist.id)}
                            className="text-destructive"
                          >
                            <Trash2 size={14} className="mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollArea>
        </div>

        <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Playlist</DialogTitle>
              <DialogDescription>Enter a new name for your playlist.</DialogDescription>
            </DialogHeader>
            <Input
              placeholder="Playlist name"
              value={renamePlaylistName}
              onChange={(e) => setRenamePlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRenamePlaylist()}
              aria-label="New playlist name"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRenamePlaylist} disabled={!renamePlaylistName.trim()}>
                Rename
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
