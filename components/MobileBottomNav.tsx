"use client"

import { Home, Search, Library, Music2 } from "lucide-react"

interface MobileBottomNavProps {
  currentView: string;
  onNavigate: (view: "home" | "search" | "playlist" | "liked" | "library" | "stats" | "joels") => void;
}

export function MobileBottomNav({ currentView, onNavigate }: MobileBottomNavProps) {
  return (
    <div className="lg:hidden bg-black/80 backdrop-blur-xl border-t border-white/[0.07] pb-2 z-40">
      <div className="flex justify-around items-center pt-2 pb-1">
        <button
          onClick={() => onNavigate("home")}
          className={`flex flex-col items-center justify-center space-y-1 w-full py-1 ${
            currentView === "home" ? "text-primary" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Home size={22} className={currentView === "home" ? "fill-primary/20" : ""} />
          <span className="text-[10px] font-medium">Home</span>
        </button>

        <button
          onClick={() => onNavigate("search")}
          className={`flex flex-col items-center justify-center space-y-1 w-full py-1 ${
            currentView === "search" ? "text-primary" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Search size={22} />
          <span className="text-[10px] font-medium">Search</span>
        </button>

        <button
          onClick={() => onNavigate("library")}
          className={`flex flex-col items-center justify-center space-y-1 w-full py-1 ${
            currentView === "library" ? "text-primary" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Library size={22} className={currentView === "library" ? "fill-primary/20" : ""} />
          <span className="text-[10px] font-medium">Library</span>
        </button>

        <button
          onClick={() => onNavigate("joels")}
          className={`flex flex-col items-center justify-center space-y-1 w-full py-1 ${
            currentView === "joels" ? "text-primary" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Music2 size={22} className={currentView === "joels" ? "fill-primary/20" : ""} />
          <span className="text-[10px] font-medium">Joel's</span>
        </button>
      </div>
    </div>
  )
}
