"use client"

import { useState } from "react"
import {
  Home,
  Search,
  Library,
  PlusSquare,
  Heart,
  MoreVertical,
  Edit2,
  Trash2,
  Sun,
  Moon,
  X,
  Download,
  Upload,
} from "lucide-react"
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
  onNavigate: (view: "home" | "search" | "playlist" | "liked" | "library") => void
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
    setPlaylists,
  } = useApp()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [renamePlaylistId, setRenamePlaylistId] = useState<string | null>(null)
  const [renamePlaylistName, setRenamePlaylistName] = useState("")
  const [playlistToDelete, setPlaylistToDelete] = useState<{ id: string; name: string } | null>(null)
  const [activeView, setActiveView] = useState<string>("")

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

  const handleDeletePlaylist = () => {
    if (playlistToDelete) {
      deletePlaylist(playlistToDelete.id)
      setIsDeleteDialogOpen(false)
      setPlaylistToDelete(null)
    }
  }

  const openRenameDialog = (id: string, currentName: string) => {
    setRenamePlaylistId(id)
    setRenamePlaylistName(currentName)
    setIsRenameDialogOpen(true)
  }

  const openDeleteDialog = (id: string, name: string) => {
    setPlaylistToDelete({ id, name })
    setIsDeleteDialogOpen(true)
  }

  const handlePlaylistClick = (id: string) => {
    setCurrentPlaylistId(id)
    setActiveView("playlist")
    onNavigate("playlist")
    onClose()
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const handleExportPlaylists = () => {
    const dataStr = JSON.stringify(playlists, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `joelify-playlists-${new Date().toISOString().split("T")[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImportPlaylists = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string)
          if (Array.isArray(imported)) {
            setPlaylists(imported)
            alert("Playlists imported successfully!")
          } else {
            alert("Invalid playlist file format")
          }
        } catch (error) {
          alert("Error importing playlists")
          console.error(error)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleNavigate = (view: "home" | "search" | "playlist" | "liked" | "library") => {
    setActiveView(view)
    onNavigate(view)
    onClose()
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} aria-hidden="true" />}

      <div
        className={`fixed lg:relative inset-y-0 left-0 z-50 w-60 bg-black text-gray-300 flex flex-col border-border transform transition-transform duration-300 lg:transform-none ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
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
              <ul>
                <li>
                  <button
                    onClick={() => handleNavigate("home")}
                    className={`flex items-center space-x-3 w-full text-left transition-colors p-2 rounded ${
                      activeView === "home" ? "bg-primary/10 text-primary border-l-4 border-primary" : "hover:text-white"
                    }`}
                    aria-label="Go to home"
                  >
                    <Home size={24} />
                    <span>Home</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleNavigate("search")}
                    className={`flex items-center space-x-3 w-full text-left transition-colors p-2 rounded ${
                      activeView === "search" ? "bg-primary/10 text-primary border-l-4 border-primary" : "hover:text-white"
                    }`}
                    aria-label="Go to search"
                  >
                    <Search size={24} />
                    <span>Search</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleNavigate("library")}
                    className={`flex items-center space-x-3 w-full text-left transition-colors p-2 rounded ${
                      activeView === "library" ? "bg-primary/10 text-primary border-l-4 border-primary" : "hover:text-white"
                    }`}
                    aria-label="Go to your library"
                  >
                    <Library size={24} />
                    <span>Your Library</span>
                  </button>
                </li>
                <li>
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <button
                        className={`flex items-center space-x-3 w-full text-left transition-colors p-2 rounded ${
                          activeView === "create-playlist" ? "bg-primary/10 text-primary border-l-4 border-primary" : "hover:text-white"
                        }`}
                      >
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
                </li>
                <li>
                  <button
                    onClick={() => handleNavigate("liked")}
                    className={`flex items-center space-x-3 w-full text-left transition-colors p-2 rounded relative ${
                      activeView === "liked" ? "bg-primary/10 text-primary border-l-4 border-primary" : "hover:text-white"
                    }`}
                  >
                    <Heart size={24} />
                    <span>Liked Songs</span>
                    {likedSongs.length > 0 && (
                      <span className="ml-auto text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                        {likedSongs.length}
                      </span>
                    )}
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="px-4 pb-4">
                <h2 className="text-xs uppercase font-semibold mb-3 text-gray-400">Playlists</h2>
                <ul className="space-y-1">
                  {playlists.map((playlist) => (
                    <li key={playlist.id} className="group">
                      <div
                        className={`flex items-center justify-between py-1 px-2 rounded cursor-pointer transition-colors ${
                          currentPlaylistId === playlist.id ? "bg-primary/10 text-primary border-l-4 border-primary" : "hover:bg-white/10"
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
                            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                              <DialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  onClick={() => openDeleteDialog(playlist.id, playlist.name)}
                                  className="text-destructive"
                                >
                                  <Trash2 size={14} className="mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Delete Playlist</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to delete {playlistToDelete?.name}? This action cannot be
                                    undone.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={handleDeletePlaylist}
                                    className="bg-destructive/80 hover:bg-destructive/90"
                                  >
                                    Delete
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollArea>
          </div>

          <div className="p-3 border-border">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={handleExportPlaylists}
                className="flex items-center space-x-3 hover:text-white text-left transition-colors text-sm"
                disabled={playlists.length === 0}
              >
                <Download size={20} />
                <span>Export</span>
              </button>
              <span className="text-gray-400">|</span>
              <button
                onClick={handleImportPlaylists}
                className="flex items-center space-x-3 hover:text-white text-left transition-colors text-sm"
              >
                <Upload size={20} />
                <span>Import</span>
              </button>
            </div>
            <div className="text-xs text-gray-400 text-center">
              © 2025 Joel Tan, v1.0.0
            </div>
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
      </div>
    </>
  )
}
