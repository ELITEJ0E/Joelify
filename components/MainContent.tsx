"use client"
import { SearchView } from "./SearchView"
import { PlaylistView } from "./PlaylistView"
import { HomeView } from "./HomeView"

export function MainContent({ view }: { view: "home" | "search" | "playlist" }) {
  if (view === "search") {
    return <SearchView />
  }

  if (view === "playlist") {
    return <PlaylistView />
  }

  return <HomeView />
}
