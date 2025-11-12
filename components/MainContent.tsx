"use client"

import { SearchView } from "./SearchView"
import { PlaylistView } from "./PlaylistView"
import { HomeView } from "./HomeView"
import { LikedSongsView } from "./LikedSongsView"
import { LibraryView } from "./LibraryView"
import { StatisticsView } from "./StatisticsView"

interface MainContentProps {
  view: "home" | "search" | "playlist" | "liked" | "library" | "stats"
  onNavigate: (view: "home" | "search" | "playlist" | "liked" | "library" | "stats") => void
}

export function MainContent({ view, onNavigate }: MainContentProps) {
  if (view === "search") {
    return <SearchView />
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

  return <HomeView onNavigate={onNavigate} />
}
