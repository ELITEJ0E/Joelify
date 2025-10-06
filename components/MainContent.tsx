"use client"
import { SearchView } from "./SearchView"
import { PlaylistView } from "./PlaylistView"
import { HomeView } from "./HomeView"
import { LikedSongsView } from "./LikedSongsView"

export function MainContent({ view }: { view: "home" | "search" | "playlist" | "liked" }) {
  if (view === "search") {
    return <SearchView />
  }

  if (view === "playlist") {
    return <PlaylistView />
  }

  if (view === "liked") {
    return <LikedSongsView />
  }

  return <HomeView />
}
