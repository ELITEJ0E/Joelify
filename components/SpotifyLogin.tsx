"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { loginWithSpotify, logout, isAuthenticated, getSpotifyProfile } from "@/lib/spotifyAuth"
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

  useEffect(() => {
    checkAuthStatus()
  }, [])

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
        <CardContent className="pt-6">
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-green-500" />
            Spotify Connected
          </CardTitle>
          <CardDescription>You're connected to Spotify</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={profile.images[0]?.url || "/placeholder.svg"} alt={profile.display_name} />
                <AvatarFallback>{profile.display_name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{profile.display_name}</p>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Connect Spotify
        </CardTitle>
        <CardDescription>Login to stream music from your Spotify account</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleLogin} className="w-full bg-green-500 hover:bg-green-600">
          <LogIn className="h-4 w-4 mr-2" />
          Login with Spotify
        </Button>
      </CardContent>
    </Card>
  )
}
