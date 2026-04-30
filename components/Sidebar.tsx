"use client"

import { useState, useEffect, useCallback } from "react"
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
  Check,
  Download,
  Upload,
  BarChart3,
  Copy,
  ClipboardPaste,
  FileText,
  Music2,
} from "lucide-react"
import { CustomToast } from "./CustomToast"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
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
import { AudioSettings } from "./AudioSettings"
import { FirebaseLogin } from "./FirebaseLogin"
import { KeyboardShortcuts } from "./KeyboardShortcuts"


interface SidebarProps {
  onNavigate: (view: "home" | "search" | "playlist" | "liked" | "library" | "stats" | "joels") => void
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
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [exportText, setExportText] = useState("")
  const [importText, setImportText] = useState("")
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [renamePlaylistId, setRenamePlaylistId] = useState<string | null>(null)
  const [renamePlaylistName, setRenamePlaylistName] = useState("")
  const [playlistToDelete, setPlaylistToDelete] = useState<{ id: string; name: string } | null>(null)
  const [activeView, setActiveView] = useState<string>("")
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(true)

  const handlePopState = useCallback(() => {
    setIsCreateDialogOpen(false)
    setIsRenameDialogOpen(false)
    setIsDeleteDialogOpen(false)
    setIsExportDialogOpen(false)
    setIsImportDialogOpen(false)
  }, [])

  useEffect(() => {
    const isAnyDialogOpen =
      isCreateDialogOpen || isRenameDialogOpen || isDeleteDialogOpen || isExportDialogOpen || isImportDialogOpen
    if (isAnyDialogOpen) {
      window.history.pushState({ modal: "sidebar-dialog" }, "")
      window.addEventListener("popstate", handlePopState)
    } else {
      window.removeEventListener("popstate", handlePopState)
    }
    return () => window.removeEventListener("popstate", handlePopState)
  }, [isCreateDialogOpen, isRenameDialogOpen, isDeleteDialogOpen, isExportDialogOpen, isImportDialogOpen, handlePopState])

  const closeDialog = (setter: (val: boolean) => void) => {
    setter(false)
    if (window.history.state?.modal === "sidebar-dialog") {
      window.history.back()
    }
  }

  useEffect(() => {
  }, [])

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      addPlaylist(newPlaylistName.trim())
      setNewPlaylistName("")
      closeDialog(setIsCreateDialogOpen)
    }
  }

  const handleRenamePlaylist = () => {
    if (renamePlaylistId && renamePlaylistName.trim()) {
      renamePlaylist(renamePlaylistId, renamePlaylistName.trim())
      setRenamePlaylistId(null)
      setRenamePlaylistName("")
      closeDialog(setIsRenameDialogOpen)
    }
  }

  const handleDeletePlaylist = () => {
    if (playlistToDelete) {
      deletePlaylist(playlistToDelete.id)
      closeDialog(setIsDeleteDialogOpen)
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

  // Convert playlists to simple text format:
  // PLAYLIST: name
  // - song title | artist | videoId
  const playlistsToText = () => {
    return playlists.map(playlist => {
      const header = `PLAYLIST: ${playlist.name}`
      const tracks = playlist.tracks.map(track => 
        `- ${track.title} | ${track.artist} | ${track.id}`
      ).join("\n")
      return tracks ? `${header}\n${tracks}` : header
    }).join("\n\n")
  }

  // Parse text format back to playlists
  const textToPlaylists = (text: string) => {
    const lines = text.trim().split("\n")
    const result: typeof playlists = []
    let currentPlaylist: typeof playlists[0] | null = null

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      if (trimmed.toUpperCase().startsWith("PLAYLIST:")) {
        if (currentPlaylist && currentPlaylist.tracks.length > 0) {
          result.push(currentPlaylist)
        }
        currentPlaylist = {
          id: `playlist-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          name: trimmed.substring(trimmed.indexOf(":") + 1).trim() || "Imported Playlist",
          tracks: [],
          createdAt: Date.now()
        }
      } else if (trimmed.startsWith("-") && currentPlaylist) {
        const parts = trimmed.slice(1).split("|").map(p => p.trim())
        if (parts.length >= 3) {
          const videoId = parts[2]
          currentPlaylist.tracks.push({
            id: videoId,
            title: parts[0] || "Unknown Title",
            artist: parts[1] || "Unknown Artist",
            thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            duration: "0:00"
          })
        }
      }
    }
    if (currentPlaylist && currentPlaylist.tracks.length > 0) {
      result.push(currentPlaylist)
    }
    return result
  }

  const handleExportPlaylists = () => {
    const text = playlistsToText()
    setExportText(text)
    setIsExportDialogOpen(true)
  }

  const handleCopyToClipboard = async () => {
    try {
      toast.custom((t) => (
        <CustomToast 
          t={t} 
          title="Copied to clipboard!" 
          description="You can now paste this into WhatsApp or any other app." 
          Icon={Check} 
        />
      ))
    } catch (err) {
      toast.error("Failed to copy to clipboard", {
        className: "bg-black/90 border-red-500/50 text-red-200 backdrop-blur-xl"
      })
    }
  }

  const handleDownloadText = () => {
    try {
      const dataBlob = new Blob([exportText], { type: "text/plain" })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `joelify-playlists-${new Date().toISOString().split("T")[0]}.txt`
      link.click()
      URL.revokeObjectURL(url)
      
      toast.custom((t) => (
        <CustomToast 
          t={t} 
          title="Download started" 
          description="Your playlists have been saved as a .txt file." 
          Icon={Download} 
        />
      ))
    } catch (err) {
      toast.error("Failed to download file", {
        className: "bg-black/90 border-red-500/50 text-red-200 backdrop-blur-xl"
      })
    }
  }

  const handleImportPlaylists = () => {
    setImportText("")
    setIsImportDialogOpen(true)
  }

  const handleImportFromText = () => {
    if (!importText.trim()) {
      toast.error("Please paste some text first", {
        className: "bg-red-950 border-red-500/50 text-red-200"
      })
      return
    }
    
    try {
      const imported = textToPlaylists(importText)
      if (imported.length > 0) {
        setPlaylists([...playlists, ...imported])
        closeDialog(setIsImportDialogOpen)
        setImportText("")
        
        toast.custom((t) => (
          <CustomToast 
            t={t} 
            title="Import Successful!" 
            description={`Imported ${imported.length} playlist(s) to your library.`} 
            Icon={Upload} 
          />
        ))
      } else {
        toast.error("No valid playlists found", {
          description: "Check the format: PLAYLIST: Name followed by - Title | Artist | videoId",
          className: "bg-black/90 border-red-500/50 text-red-200 backdrop-blur-xl"
        })
      }
    } catch (err) {
      toast.error("Import failed", {
        description: "An unexpected error occurred during import.",
        className: "bg-black/90 border-red-500/50 text-red-200 backdrop-blur-xl"
      })
    }
  }

  const handleImportFromFile = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".txt,.json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        
        // Try JSON first
        try {
          const json = JSON.parse(content)
          if (Array.isArray(json) && json.length > 0 && (json[0].tracks || json[0].songs)) {
            // Basic validation that it looks like our playlist structure
            const validatedJson = json.map(p => ({
              ...p,
              id: p.id || `playlist-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              tracks: (p.tracks || p.songs || []).map((s: any) => ({
                ...s,
                id: s.id || s.videoId || `song-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                thumbnail: s.thumbnail || (s.videoId ? `https://img.youtube.com/vi/${s.videoId}/mqdefault.jpg` : ""),
                duration: s.duration || "0:00"
              })),
              createdAt: p.createdAt || Date.now()
            }))
            setPlaylists([...playlists, ...validatedJson])
            closeDialog(setIsImportDialogOpen)
            
            toast.custom((t) => (
              <CustomToast 
                t={t} 
                title="Import Successful!" 
                description={`Imported ${validatedJson.length} playlist(s) from JSON.`} 
                Icon={Upload} 
              />
            ))
            return
          }
        } catch {
          // Not JSON or invalid JSON structure, fall through to text parsing
        }

        // Try text format
        const imported = textToPlaylists(content)
        if (imported.length > 0) {
          setPlaylists([...playlists, ...imported])
          closeDialog(setIsImportDialogOpen)
          
          toast.custom((t) => (
            <CustomToast 
              t={t} 
              title="Import Successful!" 
              description={`Imported ${imported.length} playlist(s) from file.`} 
              Icon={Upload} 
            />
          ))
        } else {
          toast.error("Could not find any valid playlists in the file.", {
            className: "bg-black/90 border-red-500/50 text-red-200 backdrop-blur-xl"
          })
        }
      }
      reader.onerror = () => {
        toast.error("Failed to read the file.", {
          className: "bg-black/90 border-red-500/50 text-red-200 backdrop-blur-xl"
        })
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setImportText(text)
        toast.custom((t) => (
          <CustomToast 
            t={t} 
            title="Pasted from clipboard" 
            description="Text has been loaded into the import area." 
            Icon={ClipboardPaste} 
          />
        ))
      } else {
        toast.error("Clipboard is empty", {
          className: "bg-black/90 border-red-500/50 text-red-200 backdrop-blur-xl"
        })
      }
    } catch (err) {
      toast.error("Failed to read clipboard", {
        description: "Please paste manually into the text area.",
        className: "bg-black/90 border-red-500/50 text-red-200 backdrop-blur-xl"
      })
    }
  }

  const handleNavigate = (view: "home" | "search" | "playlist" | "liked" | "library" | "stats" | "joels") => {
    setActiveView(view)
    onNavigate(view)
    onClose()
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} aria-hidden="true" />}

      <div
        className={`fixed lg:relative inset-y-0 left-0 z-50 w-70 bg-black/40 backdrop-blur-2xl border-r border-white/[0.07] text-gray-100 flex flex-col transform transition-transform duration-300 ease-in-out lg:transform-none ${
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
              <div className="flex items-center gap-1">
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
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setActiveView("library")
                          setIsLibraryExpanded(!isLibraryExpanded)
                          onNavigate("library")
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setActiveView("library")
                            setIsLibraryExpanded(!isLibraryExpanded)
                            onNavigate("library")
                          }
                        }}
                        className={`flex items-center justify-between w-full text-left p-2.5 rounded-lg transition-all duration-300 ease-in-out cursor-pointer ${
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
                      </div>

                      {isLibraryExpanded && (
                        <div className="ml-6 mt-2 space-y-1 animate-slideDown">
                          <ScrollArea className="w-full pr-4 max-h-96">
                            <ul className="space-y-1">
                              <li>
                                <Dialog open={isCreateDialogOpen} onOpenChange={(open) => open ? setIsCreateDialogOpen(true) : closeDialog(setIsCreateDialogOpen)}>
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
                                          className="h-6 w-6 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 hover:bg-primary/10 hover:text-primary rounded-full transition-all duration-200"
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
                                        <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => open ? setIsDeleteDialogOpen(true) : closeDialog(setIsDeleteDialogOpen)}>
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
                    <li>
                      <button
                        onClick={() => handleNavigate("joels")}
                        className={`flex items-center space-x-3 w-full text-left p-2.5 rounded-lg transition-all duration-300 ease-in-out ${
                          activeView === "joels"
                            ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-l-4 border-primary shadow-md shadow-primary/10"
                            : "hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        <Music2 size={20} className="transition-transform duration-300 group-hover:scale-105" />
                        <span className="font-medium text-sm">Joel's Music</span>
                      </button>
                    </li>
                    <li className="mt-4 pt-4 border-t border-gray-800/30">
                      <FirebaseLogin />
                    </li>
                  </ul>
                </nav>
              </div>
            </ScrollArea>

            {/* FOOTER */}
            <div className="mt-auto p-4 border-t border-white/[0.07] flex-shrink-0 bg-black/20 backdrop-blur-md">
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
      <Dialog open={isRenameDialogOpen} onOpenChange={(open) => open ? setIsRenameDialogOpen(true) : closeDialog(setIsRenameDialogOpen)}>
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

      {/* Export Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={(open) => open ? setIsExportDialogOpen(true) : closeDialog(setIsExportDialogOpen)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-primary">Export Playlists</DialogTitle>
            <DialogDescription className="text-gray-300">
              Copy this text or download as a file. Share it easily via message!
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={exportText}
            readOnly
            className="h-64 font-mono text-xs bg-gray-800/50 text-gray-100 border-gray-700"
          />
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleCopyToClipboard}
              className="border-primary text-gray-300 hover:bg-gray-800/50"
            >
              <Copy size={16} className="mr-2" />
              Copy to Clipboard
            </Button>
            <Button
              onClick={handleDownloadText}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <FileText size={16} className="mr-2" />
              Download .txt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={(open) => open ? setIsImportDialogOpen(true) : closeDialog(setIsImportDialogOpen)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-primary">Import Playlists</DialogTitle>
            <DialogDescription className="text-gray-300">
              Paste playlist text below or import from a file.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePasteFromClipboard}
              className="border-primary text-gray-300 hover:bg-gray-800/50"
            >
              <ClipboardPaste size={14} className="mr-1" />
              Paste
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportFromFile}
              className="border-primary text-gray-300 hover:bg-gray-800/50"
            >
              <Upload size={14} className="mr-1" />
              From File
            </Button>
          </div>
          <Textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={`PLAYLIST: My Playlist\n- Song Title | Artist | videoId\n- Another Song | Artist | videoId`}
            className="h-64 font-mono text-xs bg-gray-800/50 text-gray-100 border-gray-700 placeholder:text-gray-500"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(false)}
              className="border-primary text-gray-300 hover:bg-gray-800/50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportFromText}
              disabled={!importText.trim()}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
