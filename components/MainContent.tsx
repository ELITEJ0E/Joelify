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

interface MainContentProps {
  view: "home" | "search" | "playlist" | "liked" | "library" | "stats" | "joels" | "downloaded" | "charts" | "explore"
  onNavigate: (view: "home" | "search" | "playlist" | "liked" | "library" | "stats" | "joels" | "downloaded" | "charts" | "explore") => void
  onOpenSidebar?: () => void
}

export function MainContent({ view, onNavigate, onOpenSidebar }: MainContentProps) {
  if (view === "charts") {
    return <ChartsView onNavigate={onNavigate} onOpenSidebar={onOpenSidebar} />
  }

  if (view === "search" || view === "explore") {
    return <SearchView onNavigate={onNavigate} onOpenSidebar={onOpenSidebar} />
  }

  if (view === "playlist") {
    return <PlaylistView />
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
