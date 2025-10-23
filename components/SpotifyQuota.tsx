"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Activity, Clock, TrendingUp } from "lucide-react"
import { getQuotaStatus, type SpotifyApiQuota } from "@/lib/spotifyApi"

export function SpotifyQuota() {
  const [quota, setQuota] = useState<SpotifyApiQuota | null>(null)
  const [timeUntilReset, setTimeUntilReset] = useState<string>("")

  useEffect(() => {
    // Update quota status every second
    const updateQuota = () => {
      const status = getQuotaStatus()
      setQuota(status)

      // Calculate time until reset
      const now = Date.now()
      const resetTime = status.resetTime
      const diff = Math.max(0, resetTime - now)
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeUntilReset(`${minutes}m ${seconds}s`)
    }

    updateQuota()
    const interval = setInterval(updateQuota, 1000)

    return () => clearInterval(interval)
  }, [])

  if (!quota) {
    return null
  }

  const usagePercentage = (quota.requestsUsed / (quota.requestsUsed + quota.requestsRemaining)) * 100
  const lastCallAgo = Math.floor((Date.now() - quota.lastCallTime) / 1000)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-green-500" />
          Spotify API Usage
        </CardTitle>
        <CardDescription>Real-time quota monitoring</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Requests Used</span>
            <span className="text-sm font-bold">
              {quota.requestsUsed} / {quota.requestsUsed + quota.requestsRemaining}
            </span>
          </div>
          <Progress value={usagePercentage} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Resets in</p>
              <p className="text-sm font-semibold">{timeUntilReset}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Last call</p>
              <p className="text-sm font-semibold">{lastCallAgo}s ago</p>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Remaining requests</span>
            <span className="font-semibold text-green-500">{quota.requestsRemaining}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
