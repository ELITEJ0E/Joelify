"use client"

import { useState, useEffect } from "react"
import {
  Home,
  Search,
  Library,
  PlusSquare,
  Heart,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Edit2,
  Trash2,
  Sun,
  Moon,
  X,
  Download,
  Upload,
  BarChart3,
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
import { ThemeSettings } from "./ThemeSettings"
import { SpotifyLogin } from "./SpotifyLogin"
import { SpotifyQuota } from "./SpotifyQuota"
import { isAuthenticated } from "@/lib/spotifyAuth"
import { AudioSettings } from "./AudioSettings"
import { KeyboardShortcuts } from "./KeyboardShortcuts"


interface SidebarProps {
  onNavigate: (view: "home" | "search" | "playlist" | "liked" | "library" | "stats") => void
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
    audioSettings,
    setAudioSettings,
    primaryColor = "green-500", // Default to green-500 if not provided
  } = useApp()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [renamePlaylistId, setRenamePlaylistId] = useState<string | null>(null)
  const [renamePlaylistName, setRenamePlaylistName] = useState("")
  const [playlistToDelete, setPlaylistToDelete] = useState<{ id: string; name: string } | null>(null)
  const [activeView, setActiveView] = useState<string>("")
  const [isSpotifyAuth, setIsSpotifyAuth] = useState(false)
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(true)

  useEffect(() => {
    setIsSpotifyAuth(isAuthenticated())
  }, [])

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

  const handleNavigate = (view: "home" | "search" | "playlist" | "liked" | "library" | "stats") => {
    setActiveView(view)
    onNavigate(view)
    onClose()
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} aria-hidden="true" />}

      <div
        className={`fixed lg:relative inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-gray-950 to-gray-900 text-gray-100 flex flex-col transform transition-transform duration-300 ease-in-out lg:transform-none ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* HEADER */}
          <div className="p-4 flex-shrink-0 border-b border-gray-800/30">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70 tracking-tight">
                Joelify
              </h1>
              <div className="flex items-center gap-2">
                <AudioSettings settings={audioSettings} onChange={setAudioSettings} />
                <KeyboardShortcuts />
                <ThemeSettings />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleTheme}
                  className="text-gray-400 hover:text-white hover:bg-primary h-8 w-8 transition-all duration-300 ease-in-out"
                >
                  {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onClose}
                  className="text-gray-400 hover:text-white hover:bg-primary h-8 w-8 transition-all duration-300 ease-in-out lg:hidden"
                >
                  <X size={18} />
                </Button>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                <nav>
                  <ul className="space-y-1">
                    <li>
                      <button
                        onClick={() => handleNavigate("home")}
                        className={`flex items-center space-x-3 w-full text-left p-2.5 rounded-lg transition-all duration-300 ease-in-out ${
                          activeView === "home"
                            ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-l-4 border-primary shadow-md shadow-primary/10"
                            : "hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        <Home size={20} className="transition-transform duration-300 group-hover:scale-105" />
                        <span className="font-medium text-sm">Home</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => handleNavigate("search")}
                        className={`flex items-center space-x-3 w-full text-left p-2.5 rounded-lg transition-all duration-300 ease-in-out ${
                          activeView === "search"
                            ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-l-4 border-primary shadow-md shadow-primary/10"
                            : "hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        <Search size={20} className="transition-transform duration-300 group-hover:scale-105" />
                        <span className="font-medium text-sm">Search</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          setActiveView("library")
                          setIsLibraryExpanded(!isLibraryExpanded)
                          onNavigate("library")
                        }}
                        className={`flex items-center justify-between w-full text-left p-2.5 rounded-lg transition-all duration-300 ease-in-out ${
                          activeView === "library"
                            ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-l-4 border-primary shadow-md shadow-primary/10"
                            : "hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Library size={20} className="transition-transform duration-300 group-hover:scale-105" />
                          <span className="font-medium text-sm">Your Library</span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 p-0 transition-transform duration-300 ease-in-out hover:bg-primary/10 hover:text-primary rounded-full"
                          onClick={(e) => {
                            e.stopPropagation()
                            setIsLibraryExpanded(!isLibraryExpanded)
                          }}
                        >
                          {isLibraryExpanded ? (
                            <ChevronDown size={16} className="transition-transform duration-300" />
                          ) : (
                            <ChevronRight size={16} className="transition-transform duration-300" />
                          )}
                        </Button>
                      </button>

                      {isLibraryExpanded && (
                        <div className="ml-6 mt-2 space-y-1 animate-slideDown">
                          <ScrollArea className="w-full pr-4 max-h-96">
                            <ul className="space-y-1">
                              <li>
                                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                                  <DialogTrigger asChild>
                                    <button className="flex items-center space-x-3 w-full text-left p-2.5 rounded-lg transition-all duration-300 ease-in-out hover:bg-primary/10 hover:text-primary">
                                      <PlusSquare
                                        size={20}
                                        className="transition-transform duration-300 group-hover:scale-105"
                                      />
                                      <span className="font-medium text-sm">Create Playlist</span>
                                    </button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle className="text-primary">Create New Playlist</DialogTitle>
                                      <DialogDescription className="text-gray-300">
                                        Give your playlist a name to get started.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <Input
                                      placeholder="My Playlist"
                                      value={newPlaylistName}
                                      onChange={(e) => setNewPlaylistName(e.target.value)}
                                      onKeyDown={(e) => e.key === "Enter" && handleCreatePlaylist()}
                                      className="border-primary bg-gray-800/50 text-gray-100 focus:ring-2 focus:ring-primary transition-all duration-200"
                                    />
                                    <DialogFooter>
                                      <Button
                                        variant="outline"
                                        onClick={() => setIsCreateDialogOpen(false)}
                                        className="border-primary text-gray-300 hover:bg-gray-800/50"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={handleCreatePlaylist}
                                        disabled={!newPlaylistName.trim()}
                                        className="bg-primary hover:bg-primary/90 text-white"
                                      >
                                        Create
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </li>

                              {playlists.map((playlist) => (
                                <li key={playlist.id} className="group">
                                  <div className="flex items-center justify-between py-1.5 px-2 rounded-lg transition-all duration-300 ease-in-out">
                                    <button
                                      onClick={() => handlePlaylistClick(playlist.id)}
                                      className={`flex-1 text-left font-medium text-sm transition-all duration-300 ${
                                        currentPlaylistId === playlist.id
                                          ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-l-2 border-primary shadow-md shadow-primary/10"
                                          : "hover:bg-primary/10 hover:text-primary"
                                      }`}
                                    >
                                      {playlist.name}
                                    </button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-primary/10 hover:text-primary rounded-full transition-all duration-200"
                                        >
                                          <MoreVertical size={14} />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className=" border-gray-800/50">
                                        <DropdownMenuItem
                                          onClick={() => openRenameDialog(playlist.id, playlist.name)}
                                          className="text-gray-200 hover:bg-primary/10 hover:text-primary"
                                        >
                                          <Edit2 size={14} className="mr-2" />
                                          Rename
                                        </DropdownMenuItem>
                                        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                          <DialogTrigger asChild>
                                            <DropdownMenuItem
                                              onSelect={(e) => e.preventDefault()}
                                              onClick={() => openDeleteDialog(playlist.id, playlist.name)}
                                              className="text-red-400 hover:bg-primary/10 hover:text-red-300"
                                            >
                                              <Trash2 size={14} className="mr-2" />
                                              Delete
                                            </DropdownMenuItem>
                                          </DialogTrigger>
                                          <DialogContent>
                                            <DialogHeader>
                                              <DialogTitle className="text-primary">Delete Playlist</DialogTitle>
                                              <DialogDescription className="text-gray-300">
                                                Are you sure you want to delete {playlistToDelete?.name}?
                                              </DialogDescription>
                                            </DialogHeader>
                                            <DialogFooter>
                                              <Button
                                                variant="outline"
                                                onClick={() => setIsDeleteDialogOpen(false)}
                                                className="border-primary text-gray-300 hover:bg-gray-800/50"
                                              >
                                                Cancel
                                              </Button>
                                              <Button
                                                onClick={handleDeletePlaylist}
                                                className="bg-red-500 hover:bg-red-600 text-white"
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
                          </ScrollArea>
                        </div>
                      )}
                    </li>
                    <li>
                      <button
                        onClick={() => handleNavigate("liked")}
                        className={`flex items-center space-x-3 w-full text-left p-2.5 rounded-lg transition-all duration-300 ease-in-out relative ${
                          activeView === "liked"
                            ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-l-4 border-primary shadow-md shadow-primary/10"
                            : "hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        <Heart size={20} className="transition-transform duration-300 group-hover:scale-105" />
                        <span className="font-medium text-sm">Liked Songs</span>
                        {likedSongs.length > 0 && (
                          <span className="ml-auto text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                            {likedSongs.length}
                          </span>
                        )}
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => handleNavigate("stats")}
                        className={`flex items-center space-x-3 w-full text-left p-2.5 rounded-lg transition-all duration-300 ease-in-out ${
                          activeView === "stats"
                            ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-l-4 border-primary shadow-md shadow-primary/10"
                            : "hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        <BarChart3 size={20} className="transition-transform duration-300 group-hover:scale-105" />
                        <span className="font-medium text-sm">Statistics</span>
                      </button>
                    </li>
                    <li className="mt-4 pt-4 border-t border-gray-800/30">
                      <SpotifyLogin />
                      {isSpotifyAuth && (
                        <div className="mt-3">
                          <SpotifyQuota />
                        </div>
                      )}
                    </li>
                  </ul>
                </nav>
              </div>
            </ScrollArea>

            {/* FOOTER */}
            <div className="mt-auto p-4 border-t border-gray-800/30 flex-shrink-0 bg-gradient-to-t from-gray-950/80 to-gray-900/80">
              <div className="flex items-center justify-center mb-2 space-x-4">
                <button
                  onClick={handleExportPlaylists}
                  className="flex items-center space-x-2 text-gray-300 hover:text-primary text-left transition-all duration-300 ease-in-out text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={playlists.length === 0}
                >
                  <Download size={16} />
                  <span>Export</span>
                </button>
                <span className="text-gray-600">|</span>
                <button
                  onClick={handleImportPlaylists}
                  className="flex items-center space-x-2 text-gray-300 hover:text-primary text-left transition-all duration-300 ease-in-out text-sm"
                >
                  <Upload size={16} />
                  <span>Import</span>
                </button>
              </div>
              <div className="text-xs text-primary text-center">© 2025 Joel Tan, v1.0.0</div>
            </div>
          </div>
        </div>
      </div>

      {/* DIALOGS */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-primary">Rename Playlist</DialogTitle>
            <DialogDescription className="text-gray-300">Enter a new name for your playlist.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Playlist name"
            value={renamePlaylistName}
            onChange={(e) => setRenamePlaylistName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRenamePlaylist()}
            className="border-primary bg-gray-800/50 text-gray-100 focus:ring-2 focus:ring-primary transition-all duration-200"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRenameDialogOpen(false)}
              className="border-primary text-gray-300 hover:bg-gray-800/50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenamePlaylist}
              disabled={!renamePlaylistName.trim()}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
