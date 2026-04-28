"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { exchangeCodeForTokens } from "@/lib/spotifyAuth"

export default function CallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get("code")
    const errorParam = searchParams.get("error")

    if (errorParam) {
      setError(`Authentication failed: ${errorParam}`)
      setTimeout(() => router.push("/"), 3000)
      return
    }

    if (code) {
      exchangeCodeForTokens(code)
        .then(() => {
          console.log("[Spotify] Authentication successful")
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*')
            window.close()
          } else {
            router.push("/")
          }
        })
        .catch((err) => {
          console.error("[Spotify] Token exchange failed:", err)
          setError("Failed to complete authentication")
          setTimeout(() => {
             if (window.opener) window.close()
             else router.push("/")
          }, 3000)
        })
    } else {
      setError("No authorization code received")
      setTimeout(() => router.push("/"), 3000)
    }
  }, [searchParams, router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        {error ? (
          <>
            <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
            <p className="text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">Redirecting...</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-4">Connecting to Spotify...</h1>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </>
        )}
      </div>
    </div>
  )
}
