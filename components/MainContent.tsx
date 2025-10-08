"use client"

import { SearchView } from "./SearchView"
import { PlaylistView } from "./PlaylistView"
import { HomeView } from "./HomeView"
import { LikedSongsView } from "./LikedSongsView"
import { LibraryView } from "./LibraryView"

interface MainContentProps {
  view: "home" | "search" | "playlist" | "liked" | "library"
  onNavigate: (view: "home" | "search" | "playlist" | "liked" | "library") => void
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

  return <HomeView onNavigate={onNavigate} />
}
