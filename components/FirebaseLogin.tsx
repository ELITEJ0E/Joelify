"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogIn, LogOut, Cloud, Check, Music, Heart } from "lucide-react"
import { auth } from "@/lib/firebase"
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from "firebase/auth"
import { useApp } from "@/contexts/AppContext"
import { CustomToast } from "./CustomToast"
import { toast } from "sonner"

export function FirebaseLogin() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { playlists, likedSongs } = useApp()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      toast.custom((t) => (
        <CustomToast 
          t={t} 
          title="Successfully logged in" 
          description="Your library is now synced to the cloud." 
          Icon={Check} 
        />
      ))
    } catch (error: any) {
      console.error("Firebase login error:", error)
      if (error?.code === "auth/unauthorized-domain") {
        toast.error("Unauthorized Domain", {
          description: `Add "${typeof window !== 'undefined' ? window.location.hostname : 'your domain'}" to Firebase Console -> Authentication -> Settings -> Authorized Domains.`
        })
      } else if (error?.code === "auth/popup-blocked") {
        toast.error("Popup Blocked", {
          description: "Please allow popups in your browser to sign in with Google."
        })
      } else if (error?.code === "auth/popup-closed-by-user") {
        // User voluntarily dismissed popup
      } else {
        toast.error("Failed to log in", { description: error?.message || "Authentication failed" })
      }
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      toast.custom((t) => (
        <CustomToast 
          t={t} 
          title="Logged out" 
          description="Cloud sync has been disabled." 
          Icon={LogOut} 
        />
      ))
    } catch (error: any) {
      console.error("Firebase logout error:", error)
      toast.error("Failed to log out")
    }
  }

  if (loading) {
    return (
      <Card className="bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl shadow-lg mt-4">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (user) {
    return (
      <Card className="bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl shadow-lg mt-4">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Cloud className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="truncate">Cloud Sync Active</span>
          </CardTitle>
          <CardDescription className="text-xs">Your library is synced</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={user.photoURL || "/placeholder.svg"} alt={user.displayName || "User"} />
              <AvatarFallback className="text-xs">{user.displayName?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{user.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Music className="w-3 h-3 text-primary" />
              {playlists.length} {playlists.length === 1 ? "playlist" : "playlists"}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-red-400" />
              {likedSongs.length} liked
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="w-full h-8">
            <LogOut className="h-3 w-3 mr-2" />
            Logout
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl shadow-lg mt-4">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Cloud className="h-4 w-4 flex-shrink-0 text-primary" />
          <span className="truncate">Enable Cloud Sync</span>
        </CardTitle>
        <CardDescription className="text-xs">Sync playlists across devices</CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <Button onClick={handleLogin} className="w-full bg-primary hover:bg-primary/80 h-8 text-xs transition-colors">
          <LogIn className="h-3 w-3 mr-2" />
          Login with Google
        </Button>
      </CardContent>
    </Card>
  )
}
