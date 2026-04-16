"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  User,
  LogOut,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react"

interface UserProfileProps {
  onSyncToCloud?: () => Promise<void>
  onLoadFromCloud?: () => Promise<void>
}

export function UserProfile({ onSyncToCloud, onLoadFromCloud }: UserProfileProps) {
  const {
    user,
    profile,
    isLoading,
    isSyncing,
    lastSyncedAt,
    signInWithGoogle,
    signOut,
  } = useAuth()

  const [isSignInDialogOpen, setIsSignInDialogOpen] = useState(false)
  const [syncStatus, setSyncStatus] = useState<"idle" | "success" | "error">("idle")

  const handleSync = async () => {
    if (!onSyncToCloud) return
    setSyncStatus("idle")
    try {
      await onSyncToCloud()
      setSyncStatus("success")
      setTimeout(() => setSyncStatus("idle"), 3000)
    } catch {
      setSyncStatus("error")
      setTimeout(() => setSyncStatus("idle"), 3000)
    }
  }

  const handleLoad = async () => {
    if (!onLoadFromCloud) return
    try {
      await onLoadFromCloud()
    } catch {
      // Handle error
    }
  }

  const formatLastSynced = (date: Date | null) => {
    if (!date) return "Never"
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" disabled className="h-9 w-9">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </Button>
    )
  }

  // Not signed in - show sign in button
  if (!user) {
    return (
      <Dialog open={isSignInDialogOpen} onOpenChange={setIsSignInDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-zinc-400 hover:text-white hover:bg-white/10"
          >
            <User size={18} />
            <span className="hidden sm:inline">Sign In</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">Sign in to Joelify</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Sign in with your Google account to sync your playlists, liked songs, and settings across all your devices.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Button
              onClick={() => {
                signInWithGoogle()
                setIsSignInDialogOpen(false)
              }}
              className="w-full gap-3 bg-white text-black hover:bg-gray-100"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>
            <p className="text-xs text-center text-zinc-500">
              Your data stays private and secure. We only sync your music preferences.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Signed in - show profile dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-9 w-9 rounded-full p-0 hover:bg-white/10"
        >
          <Avatar className="h-9 w-9 border-2 border-primary/50">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.display_name || "User"} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm">
              {profile?.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          {/* Sync indicator dot */}
          {isSyncing && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-zinc-900 border-zinc-800">
        {/* User info */}
        <div className="px-3 py-3 border-b border-zinc-800">
          <p className="font-medium text-white truncate">
            {profile?.display_name || "User"}
          </p>
          <p className="text-sm text-zinc-400 truncate">{user.email}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-zinc-500">
            {lastSyncedAt ? (
              <>
                <Cloud size={12} className="text-primary" />
                <span>Synced {formatLastSynced(lastSyncedAt)}</span>
              </>
            ) : (
              <>
                <CloudOff size={12} />
                <span>Not synced yet</span>
              </>
            )}
          </div>
        </div>

        {/* Sync actions */}
        <div className="py-1">
          <DropdownMenuItem
            onClick={handleSync}
            disabled={isSyncing}
            className="gap-2 cursor-pointer text-zinc-300 hover:text-white focus:text-white focus:bg-white/10"
          >
            {isSyncing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : syncStatus === "success" ? (
              <CheckCircle2 size={16} className="text-green-500" />
            ) : syncStatus === "error" ? (
              <AlertCircle size={16} className="text-red-500" />
            ) : (
              <RefreshCw size={16} />
            )}
            {isSyncing ? "Syncing..." : "Sync to Cloud"}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleLoad}
            disabled={isSyncing}
            className="gap-2 cursor-pointer text-zinc-300 hover:text-white focus:text-white focus:bg-white/10"
          >
            <Cloud size={16} />
            Load from Cloud
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="bg-zinc-800" />

        {/* Sign out */}
        <DropdownMenuItem
          onClick={signOut}
          className="gap-2 cursor-pointer text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-red-500/10"
        >
          <LogOut size={16} />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
