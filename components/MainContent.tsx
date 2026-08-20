"use client"

import { SearchView } from "./SearchView"
import { PlaylistView } from "./PlaylistView"
import { HomeView } from "./HomeView"
import { LikedSongsView } from "./LikedSongsView"
import { LibraryView } from "./LibraryView"
import { StatisticsView } from "./StatisticsView"
import { JoelsMusicView } from "./JoelsMusicView"
import { DownloadedView } from "./DownloadedView"
import { ChartsView } from "./ChartsView"
import { ExploreView } from "./ExploreView"
import { AlbumView } from "./AlbumView"

interface MainContentProps {
  view: string
  albumId?: string | null
  searchQuery?: string
  onNavigate: (view: any, params?: any) => void
  onOpenSidebar?: () => void
}

export function MainContent({ view, albumId, searchQuery, onNavigate, onOpenSidebar }: MainContentProps) {
  if (view === "album" && albumId) {
    return (
      <AlbumView
        albumId={albumId}
        onNavigate={onNavigate}
        onBack={() => onNavigate("search")}
      />
    )
  }

  if (view === "charts") {
    return <ChartsView onNavigate={onNavigate} onOpenSidebar={onOpenSidebar} />
  }

  if (view === "search" || view === "explore") {
    return (
      <SearchView
        initialQuery={searchQuery}
        onNavigate={onNavigate}
        onOpenSidebar={onOpenSidebar}
      />
    )
  }

  if (view === "playlist") {
    return <PlaylistView onNavigate={onNavigate} onOpenSidebar={onOpenSidebar} />
  }

  if (view === "liked") {
    return <LikedSongsView />
  }

  if (view === "library") {
    return <LibraryView onNavigate={onNavigate} />
  }

  if (view === "stats") {
    return <StatisticsView />
  }

  if (view === "joels") {
    return <JoelsMusicView />
  }

  if (view === "downloaded") {
    return <DownloadedView />
  }

  return <HomeView onNavigate={onNavigate} onOpenSidebar={onOpenSidebar} />
}
