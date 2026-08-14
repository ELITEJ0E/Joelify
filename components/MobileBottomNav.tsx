"use client"

import { Home, Search, TrendingUp, Library, Sparkles } from "lucide-react"

interface MobileBottomNavProps {
  currentView: string
  onNavigate: (view: "home" | "search" | "playlist" | "liked" | "library" | "stats" | "joels" | "downloaded" | "charts" | "explore") => void
}

export function MobileBottomNav({ currentView, onNavigate }: MobileBottomNavProps) {
  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "search", label: "Search", icon: Search },
    { id: "charts", label: "Charts", icon: TrendingUp },
    { id: "library", label: "Library", icon: Library },
    { id: "joels", label: "Joel's", icon: Sparkles },
  ] as const

  return (
    <nav className="lg:hidden shrink-0 w-full z-50 bg-black/95 backdrop-blur-2xl border-t border-white/10 px-2 py-2 sticky bottom-0 shadow-2xl">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = currentView === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id as any)}
              className={`transition-all duration-300 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full ${
                isActive
                  ? "bg-primary/20 text-primary border border-primary/30 font-semibold shadow-md shadow-primary/10"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Icon size={20} className={isActive ? "text-primary" : ""} />
              {isActive && (
                <span className="text-xs font-semibold whitespace-nowrap tracking-tight">
                  {tab.label}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
