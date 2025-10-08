"use client"
import { SearchView } from "./SearchView"
import { PlaylistView } from "./PlaylistView"
import { HomeView } from "./HomeView"
import { LikedSongsView } from "./LikedSongsView"
import { LibraryView } from "./LibraryView"

export function MainContent({ view }: { view: "home" | "search" | "playlist" | "liked" | "library" }) {
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
    return <LibraryView />
  }

  return <HomeView />
}
