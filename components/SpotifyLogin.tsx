"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { loginWithSpotify, logout, isAuthenticated, getSpotifyProfile, exchangeCodeForTokens } from "@/lib/spotifyAuth"
import { LogIn, LogOut, Music } from "lucide-react"

interface SpotifyProfile {
  id: string
  display_name: string
  email: string
  images: { url: string }[]
}

export function SpotifyLogin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [profile, setProfile] = useState<SpotifyProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const checkAuthStatus = async () => {
      setLoading(true)

      // Handle Spotify auth code exchange
      const code = searchParams.get("code")
      if (code) {
        try {
          await exchangeCodeForTokens(code)
          console.log("[Spotify] Authentication successful!")
          router.replace("/")
        } catch (err) {
          console.error("[Spotify] Token exchange failed:", err)
          router.replace(`/?spotify_error=${encodeURIComponent(err.message)}`)
        }
      }

      // Check authentication status and load profile
      const authenticated = isAuthenticated()
      setIsLoggedIn(authenticated)

      if (authenticated) {
        try {
          const profileData = await getSpotifyProfile()
          setProfile(profileData)
          console.log("[Spotify] Profile loaded:", profileData.display_name)
        } catch (error) {
          console.error("[Spotify] Failed to load profile:", error)
          setIsLoggedIn(false)
        }
      }
      setLoading(false)
    }

    checkAuthStatus()
  }, [searchParams, router])

  const handleLogin = () => {
    console.log("[Spotify] Initiating login")
    loginWithSpotify()
  }

  const handleLogout = () => {
    logout()
    setIsLoggedIn(false)
    setProfile(null)
    console.log("[Spotify] Logged out")
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoggedIn && profile) {
    return (
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Music className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span className="truncate">Spotify Connected</span>
          </CardTitle>
          <CardDescription className="text-xs">You're connected to Spotify</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={profile.images[0]?.url || "/placeholder.svg"} alt={profile.display_name} />
              <AvatarFallback className="text-xs">{profile.display_name[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{profile.display_name}</p>
              <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
            </div>
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
    <Card>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Music className="h-4 w-4 flex-shrink-0 text-primary" />
          <span className="truncate">Connect Spotify</span>
        </CardTitle>
        <CardDescription className="text-xs">Login to stream music from your account</CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <Button onClick={handleLogin} className="w-full bg-primary hover:bg-primary/80 h-8 text-xs transition-colors">
          <LogIn className="h-3 w-3 mr-2" />
          Login with Spotify
        </Button>
      </CardContent>
    </Card>
  )
}
