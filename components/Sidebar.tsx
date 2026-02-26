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
        className={`fixed lg:relative inset-y-0 left-0 z-50 w-72 bg-[hsl(var(--surface-1))] text-foreground flex flex-col transform transition-transform duration-300 ease-out lg:transform-none border-r border-border/50 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* HEADER */}
          <div className="px-5 py-4 flex-shrink-0 border-b border-border/40">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold tracking-tight">
                <span className="text-primary">Joelify</span>
              </h1>
              <div className="flex items-center gap-0.5">
                <AudioSettings settings={audioSettings} onChange={setAudioSettings} />
                <KeyboardShortcuts />
                <ThemeSettings />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleTheme}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onClose}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground lg:hidden"
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="px-3 py-3 space-y-1">
                <nav>
                  <ul className="space-y-0.5">
                    <li>
                      <button
                        onClick={() => handleNavigate("home")}
                        className={`group flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 ease-out text-sm font-medium ${
                          activeView === "home"
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        }`}
                      >
                        <Home size={17} className={activeView === "home" ? "text-primary" : ""} />
                        <span>Home</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => handleNavigate("search")}
                        className={`group flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 ease-out text-sm font-medium ${
                          activeView === "search"
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        }`}
                      >
                        <Search size={17} className={activeView === "search" ? "text-primary" : ""} />
                        <span>Search</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          setActiveView("library")
                          setIsLibraryExpanded(!isLibraryExpanded)
                          onNavigate("library")
                        }}
                        className={`group flex items-center justify-between w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 ease-out text-sm font-medium ${
                          activeView === "library"
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Library size={17} className={activeView === "library" ? "text-primary" : ""} />
                          <span>Your Library</span>
                        </div>
                        <button
                          className="p-0.5 rounded-lg hover:bg-white/10 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            setIsLibraryExpanded(!isLibraryExpanded)
                          }}
                        >
                          <ChevronDown
                            size={14}
                            className={`transition-transform duration-200 ${isLibraryExpanded ? "rotate-0" : "-rotate-90"}`}
                          />
                        </button>
                      </button>

                      {isLibraryExpanded && (
                        <div className="ml-4 mt-1 space-y-0.5 animate-slideDown">
                          <ScrollArea className="w-full pr-2 max-h-80">
                            <ul className="space-y-0.5">
                              <li>
                                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                                  <DialogTrigger asChild>
                                    <button className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-xl transition-all duration-200 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5">
                                      <PlusSquare size={15} />
                                      <span>Create Playlist</span>
                                    </button>
                                  </DialogTrigger>
                                  <DialogContent className="border-border/50 bg-card shadow-glass">
                                    <DialogHeader>
                                      <DialogTitle>Create New Playlist</DialogTitle>
                                      <DialogDescription className="text-muted-foreground">
                                        Give your playlist a name to get started.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <Input
                                      placeholder="My Playlist"
                                      value={newPlaylistName}
                                      onChange={(e) => setNewPlaylistName(e.target.value)}
                                      onKeyDown={(e) => e.key === "Enter" && handleCreatePlaylist()}
                                      className="border-border/60 bg-secondary/50 focus:ring-1 focus:ring-primary"
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

                              {playlists.map((playlist) => (
                                <li key={playlist.id} className="group">
                                  <div className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 ${
                                    currentPlaylistId === playlist.id
                                      ? "bg-primary/12 text-primary"
                                      : "hover:bg-white/5"
                                  }`}>
                                    <button
                                      onClick={() => handlePlaylistClick(playlist.id)}
                                      className="flex-1 text-left text-sm font-medium truncate"
                                    >
                                      {playlist.name}
                                    </button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-lg"
                                        >
                                          <MoreVertical size={12} />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="border-border/50 bg-popover shadow-glass">
                                        <DropdownMenuItem
                                          onClick={() => openRenameDialog(playlist.id, playlist.name)}
                                          className="text-sm cursor-pointer"
                                        >
                                          <Edit2 size={13} className="mr-2" />
                                          Rename
                                        </DropdownMenuItem>
                                        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                          <DialogTrigger asChild>
                                            <DropdownMenuItem
                                              onSelect={(e) => e.preventDefault()}
                                              onClick={() => openDeleteDialog(playlist.id, playlist.name)}
                                              className="text-destructive text-sm cursor-pointer"
                                            >
                                              <Trash2 size={13} className="mr-2" />
                                              Delete
                                            </DropdownMenuItem>
                                          </DialogTrigger>
                                          <DialogContent className="border-border/50 bg-card shadow-glass">
                                            <DialogHeader>
                                              <DialogTitle>Delete Playlist</DialogTitle>
                                              <DialogDescription className="text-muted-foreground">
                                                Are you sure you want to delete{" "}
                                                <span className="font-medium text-foreground">{playlistToDelete?.name}</span>?
                                              </DialogDescription>
                                            </DialogHeader>
                                            <DialogFooter>
                                              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                                                Cancel
                                              </Button>
                                              <Button
                                                onClick={handleDeletePlaylist}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
                        className={`group flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 ease-out text-sm font-medium relative ${
                          activeView === "liked"
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        }`}
                      >
                        <Heart size={17} className={activeView === "liked" ? "text-primary" : ""} />
                        <span>Liked Songs</span>
                        {likedSongs.length > 0 && (
                          <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium tabular-nums">
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
                    <li className="mt-3 pt-3 border-t border-border/40">
                      <SpotifyLogin />
                      {isSpotifyAuth && (
                        <div className="mt-2">
                          <SpotifyQuota />
                        </div>
                      )}
                    </li>
                  </ul>
                </nav>
              </div>
            </ScrollArea>

            {/* FOOTER */}
            <div className="mt-auto px-4 py-3 border-t border-border/40 flex-shrink-0">
              <div className="flex items-center justify-center gap-4 mb-2">
                <button
                  onClick={handleExportPlaylists}
                  disabled={playlists.length === 0}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download size={13} />
                  <span>Export</span>
                </button>
                <span className="text-border">·</span>
                <button
                  onClick={handleImportPlaylists}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
                >
                  <Upload size={13} />
                  <span>Import</span>
                </button>
              </div>
              <p className="text-xs text-muted-foreground/50 text-center">© 2025 Joel Tan · v1.0.0</p>
            </div>
          </div>
        </div>
      </div>

      {/* RENAME DIALOG */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="border-border/50 bg-card shadow-glass">
          <DialogHeader>
            <DialogTitle>Rename Playlist</DialogTitle>
            <DialogDescription className="text-muted-foreground">Enter a new name for your playlist.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Playlist name"
            value={renamePlaylistName}
            onChange={(e) => setRenamePlaylistName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRenamePlaylist()}
            className="border-border/60 bg-secondary/50 focus:ring-1 focus:ring-primary"
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
    </>
  )
}
