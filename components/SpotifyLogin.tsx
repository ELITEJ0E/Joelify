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

  const checkAuthStatus = async () => {
    setLoading(true)
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

  useEffect(() => {
    // Handle Spotify auth code exchange inside the component if redirected (fallback)
    const code = searchParams.get("code")
    if (code) {
      exchangeCodeForTokens(code)
        .then(() => {
          console.log("[Spotify] Authentication successful!")
          router.replace("/")
          checkAuthStatus()
        })
        .catch((err) => {
          console.error("[Spotify] Token exchange failed:", err)
          router.replace(`/?spotify_error=${encodeURIComponent(err.message)}`)
        })
    } else {
      checkAuthStatus()
    }

    const handleMessage = (event: MessageEvent) => {
      // Validate origin is from AI Studio preview or localhost
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('joelify')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        checkAuthStatus();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [searchParams, router])

  const handleLogin = async () => {
    console.log("[Spotify] Initiating login")
    try {
      const url = await loginWithSpotify()
      const authWindow = window.open(
        url,
        'oauth_popup',
        'width=600,height=700'
      );
      if (!authWindow) {
        alert('Please allow popups for this site to connect your account.');
      }
    } catch (err) {
      console.error("[Spotify] Failed to get auth URL:", err)
    }
  }

  const handleLogout = () => {
    logout()
    setIsLoggedIn(false)
    setProfile(null)
    console.log("[Spotify] Logged out")
  }

  if (loading) {
    return (
      <Card className="bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl shadow-lg">
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
      <Card className="bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl shadow-lg">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Music className="h-4 w-4 text-primary flex-shrink-0" />
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
    <Card className="bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl shadow-lg">
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
