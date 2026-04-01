"use client"

import { useApp } from "@/contexts/AppContext"
import { Card } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { Clock, Music, TrendingUp, Calendar, BarChart3, Share2 } from 'lucide-react'
import { ShareMenu } from "./ShareMenu"

interface ListeningStats {
  totalPlays: number
  totalTime: number
  topTracks: Array<{ id: string; title: string; artist: string; plays: number }>
  topArtists: Array<{ name: string; plays: number }>
  recentlyPlayed: Array<{ id: string; title: string; artist: string; playedAt: Date }>
  playsByDay: Array<{ day: string; plays: number }>
}

export function StatisticsView() {
  const { queue } = useApp()
  const [stats, setStats] = useState<ListeningStats | null>(null)

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem("listening_history") || "[]")

    const trackPlays = new Map<string, { track: any; count: number }>()
    const artistPlays = new Map<string, number>()
    const dayPlays = new Map<string, number>()
    let totalTimeSeconds = 0

    history.forEach((item: any) => {
      const key = `${item.id}-${item.title}`
      trackPlays.set(key, {
        track: item,
        count: (trackPlays.get(key)?.count || 0) + 1,
      })

      artistPlays.set(item.artist, (artistPlays.get(item.artist) || 0) + 1)

      const day = new Date(item.playedAt).toLocaleDateString("en-US", { weekday: "short" })
      dayPlays.set(day, (dayPlays.get(day) || 0) + 1)

      if (item.duration && typeof item.duration === 'number') {
        totalTimeSeconds += item.duration
      }
    })

    const topTracks = Array.from(trackPlays.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([_, data]) => ({
        id: data.track.id,
        title: data.track.title,
        artist: data.track.artist,
        plays: data.count,
      }))

    const topArtists = Array.from(artistPlays.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, plays]) => ({ name, plays }))

    const recentlyPlayed = history
      .slice(-20)
      .reverse()
      .map((item: any) => ({
        id: item.id,
        title: item.title,
        artist: item.artist,
        playedAt: new Date(item.playedAt),
      }))

    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const playsByDay = weekDays.map((day) => ({
      day,
      plays: dayPlays.get(day) || 0,
    }))

    setStats({
      totalPlays: history.length,
      totalTime: totalTimeSeconds,
      topTracks,
      topArtists,
      recentlyPlayed,
      playsByDay,
    })
  }, [])

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <p className="text-muted-foreground">Loading statistics...</p>
      </div>
    )
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  const maxPlays = Math.max(...stats.playsByDay.map((d) => d.plays), 1)

  return (
    <div className="flex-1 bg-gradient-to-b from-[hsl(var(--primary)/0.06)] to-transparent text-foreground p-4 md:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">Your Statistics</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Insights into your listening habits
            </p>
          </div>
          <ShareMenu type="stats" />
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <Card className="p-4 md:p-6 bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-lg bg-primary/10">
                <Music className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total Plays</p>
                <p className="text-xl md:text-2xl font-bold">{stats.totalPlays}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-6 bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Listening Time</p>
                <p className="text-xl md:text-2xl font-bold">{formatTime(stats.totalTime)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-6 sm:col-span-2 lg:col-span-1 bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Unique Tracks</p>
                <p className="text-xl md:text-2xl font-bold">{stats.topTracks.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Weekly Activity Chart */}
        <Card className="p-4 md:p-6 bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Weekly Activity</h2>
          </div>
          <div className="flex items-end justify-between gap-1 md:gap-2 h-32 md:h-48">
            {stats.playsByDay.map((day, index) => (
              <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                <div className="relative w-full flex items-end justify-center flex-1">
                  <div
                    className="w-full bg-gradient-to-t from-primary/40 to-primary rounded-t transition-all duration-700 hover:brightness-110"
                    style={{
                      height: `${(day.plays / maxPlays) * 100}%`,
                      minHeight: day.plays > 0 ? "8px" : "0",
                      animation: `growUp 0.7s ease-out ${index * 0.05}s both`
                    }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-[10px] md:text-xs text-muted-foreground">{day.day}</p>
                  <p className="text-xs md:text-sm font-medium">{day.plays}</p>
                </div>
              </div>
            ))}
          </div>
          <style jsx>{`
            @keyframes growUp {
              from { height: 0; min-height: 0; }
            }
          `}</style>
        </Card>

        {/* Top Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Top Tracks */}
          <Card className="p-4 md:p-6 bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">Top Tracks</h2>
            </div>
            <div className="space-y-2 md:space-y-3">
              {stats.topTracks.map((track, index) => (
                <div key={track.id} className="flex items-center gap-3 md:gap-4 p-2 rounded-lg hover:bg-white/[0.04] transition-colors">
                  <div className="text-lg md:text-xl font-bold text-primary w-8 md:w-10 h-8 md:h-10 flex items-center justify-center rounded-md bg-gradient-to-br from-primary/20 to-transparent flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm md:text-base truncate">{track.title}</p>
                    <p className="text-xs md:text-sm text-muted-foreground truncate">{track.artist}</p>
                  </div>
                  <div className="text-xs md:text-sm font-medium text-muted-foreground whitespace-nowrap">
                    {track.plays} plays
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Artists */}
          <Card className="p-4 md:p-6 bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">Top Artists</h2>
            </div>
            <div className="space-y-2 md:space-y-3">
              {stats.topArtists.map((artist, index) => (
                <div key={artist.name} className="flex items-center gap-3 md:gap-4 p-2 rounded-lg hover:bg-white/[0.04] transition-colors">
                  <div className="text-lg md:text-xl font-bold text-primary w-8 md:w-10 h-8 md:h-10 flex items-center justify-center rounded-md bg-gradient-to-br from-primary/20 to-transparent flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm md:text-base truncate">{artist.name}</p>
                  </div>
                  <div className="text-xs md:text-sm font-medium text-muted-foreground whitespace-nowrap">
                    {artist.plays} plays
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Recently Played */}
        <Card className="p-4 md:p-6 bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Recently Played</h2>
          </div>
          <div className="space-y-1 md:space-y-2">
            {stats.recentlyPlayed.slice(0, 10).map((track, index) => (
              <div
                key={`${track.id}-${index}`}
                className="flex items-center justify-between p-2 md:p-3 rounded-lg hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <p className="font-medium text-sm md:text-base truncate">{track.title}</p>
                  <p className="text-xs md:text-sm text-muted-foreground truncate">{track.artist}</p>
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">
                  {track.playedAt.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
