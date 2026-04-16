"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User, Session } from "@supabase/supabase-js"

interface Profile {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  provider: string | null
  last_synced_at: string | null
}

interface UserData {
  playlists: any[]
  liked_songs: any[]
  recently_played: any[]
  settings: Record<string, any>
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isSyncing: boolean
  lastSyncedAt: Date | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  syncData: (data: Partial<UserData>) => Promise<void>
  loadUserData: () => Promise<UserData | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)

  const supabase = createClient()

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (!error && data) {
      setProfile(data)
      if (data.last_synced_at) {
        setLastSyncedAt(new Date(data.last_synced_at))
      }
    }
  }, [supabase])

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchProfile(session.user.id)
      }
      
      setIsLoading(false)
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
          setLastSyncedAt(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, fetchProfile])

  // Sign in with Google
  const signInWithGoogle = async () => {
    const redirectUrl = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? 
      `${window.location.origin}/auth/callback`

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    })
  }

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
    setLastSyncedAt(null)
  }

  // Sync user data to cloud
  const syncData = async (data: Partial<UserData>) => {
    if (!user) return

    setIsSyncing(true)
    try {
      const { error } = await supabase
        .from("user_data")
        .upsert({
          user_id: user.id,
          ...data,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" })

      if (!error) {
        const now = new Date()
        setLastSyncedAt(now)

        // Update profile's last_synced_at
        await supabase
          .from("profiles")
          .update({ last_synced_at: now.toISOString() })
          .eq("id", user.id)
      }
    } finally {
      setIsSyncing(false)
    }
  }

  // Load user data from cloud
  const loadUserData = async (): Promise<UserData | null> => {
    if (!user) return null

    const { data, error } = await supabase
      .from("user_data")
      .select("playlists, liked_songs, recently_played, settings")
      .eq("user_id", user.id)
      .single()

    if (error || !data) return null

    return {
      playlists: data.playlists || [],
      liked_songs: data.liked_songs || [],
      recently_played: data.recently_played || [],
      settings: data.settings || {},
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isSyncing,
        lastSyncedAt,
        signInWithGoogle,
        signOut,
        syncData,
        loadUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
