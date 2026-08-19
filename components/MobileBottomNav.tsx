"use client"

import { Home, Search, LineChart, Library, Sparkles } from "lucide-react"
import { BottomNavBar, type NavItem } from "@/components/ui/bottom-nav-bar"

interface MobileBottomNavProps {
  currentView: string
  onNavigate: (view: "home" | "search" | "playlist" | "liked" | "library" | "stats" | "joels" | "downloaded" | "charts" | "explore") => void
}

export function MobileBottomNav({ currentView, onNavigate }: MobileBottomNavProps) {
  const navItems: NavItem[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "search", label: "Search", icon: Search },
    { id: "charts", label: "Charts", icon: LineChart },
    { id: "library", label: "Library", icon: Library },
    { id: "joels", label: "Joel's", icon: Sparkles },
  ]

  // Map currentView to corresponding tab index
  const getActiveIndex = () => {
    switch (currentView) {
      case "home":
        return 0
      case "search":
      case "explore":
        return 1
      case "charts":
        return 2
      case "library":
      case "playlist":
      case "liked":
      case "downloaded":
        return 3
      case "joels":
        return 4
      default:
        return -1
    }
  }

  const activeIndex = getActiveIndex()

  return (
    <nav
      className="lg:hidden shrink-0 w-full z-50 bg-black/90 dark:bg-black/90 backdrop-blur-2xl border-t border-white/[0.08] px-2 py-1.5 flex items-center justify-center shadow-2xl"
      aria-label="Mobile Navigation Bar"
    >
      <BottomNavBar
        items={navItems}
        activeIndex={activeIndex}
        onItemChange={(_, item) => {
          if (item.id) {
            onNavigate(item.id as any)
          }
        }}
        className="w-full max-w-lg justify-around sm:justify-center border-white/10 bg-zinc-900/90 dark:bg-zinc-900/90"
      />
    </nav>
  )
}

