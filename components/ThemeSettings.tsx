"use client"

import { useState, useEffect } from "react"
import { Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const THEME_PRESETS = [
  { name: "Spotify Green", hsl: "142 76% 36%" },
  { name: "Tidal Blue", hsl: "200 100% 50%" },
  { name: "Apple Red", hsl: "0 85% 60%" },
  { name: "Aurora Borealis", hsl: "165 80% 55%" },
  { name: "Royal Amethyst", hsl: "268 68% 60%" },
  { name: "Sunset Mirage", hsl: "20 95% 55%" },
  { name: "Emerald Dusk", hsl: "160 65% 40%" },
  { name: "Sapphire Flame", hsl: "215 90% 55%" },
  { name: "Crimson Nebula", hsl: "350 78% 60%" },
  { name: "Golden Hour", hsl: "40 90% 55%" },
  { name: "Obsidian Rose", hsl: "325 60% 48%" },
  { name: "Midnight Luxe", hsl: "240 40% 35%" },
  { name: "Celestial Indigo", hsl: "255 65% 50%" },
  { name: "Neon Orchid", hsl: "300 80% 60%" },
  { name: "Ocean Opal", hsl: "185 75% 50%" },
  { name: "Amber Horizon", hsl: "30 85% 55%" },
  { name: "Cyber Gold", hsl: "50 95% 50%" },
  { name: "Mystic Teal", hsl: "170 70% 45%" },
  { name: "Rose Quartz", hsl: "345 70% 68%" },
  { name: "Deep Mocha", hsl: "25 25% 40%" },
]

export function ThemeSettings() {
  const [currentTheme, setCurrentTheme] = useState(THEME_PRESETS[0].hsl)

  useEffect(() => {
    const saved = localStorage.getItem("theme-accent")
    if (saved) {
      setCurrentTheme(saved)
      applyTheme(saved)
    }
  }, [])

  const applyTheme = (hsl: string) => {
    document.documentElement.style.setProperty("--primary", hsl)
    document.documentElement.style.setProperty("--accent", hsl)
    document.documentElement.style.setProperty("--ring", hsl)
    localStorage.setItem("theme-accent", hsl)
    setCurrentTheme(hsl)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="text-white/60 hover:text-white hover:bg-primary/15 h-8 w-8 transition-colors"
          aria-label="Theme settings"
        >
          <Palette size={18} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 max-h-64 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] bg-black/80 backdrop-blur-2xl border-white/[0.07]"
      >
        {/* hide scrollbar in WebKit */}
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEME_PRESETS.map((preset) => (
          <DropdownMenuItem
            key={preset.name}
            onClick={() => applyTheme(preset.hsl)}
            className="flex items-center gap-2"
          >
            <div
              className={`w-5 h-5 rounded-full border border-border ${currentTheme === preset.hsl ? 'ring-2 ring-primary/50 animate-pulse' : ''}`}
              style={{
                background: `linear-gradient(135deg, 
                  hsl(${preset.hsl}) 0%, 
                  hsl(${preset.hsl.split(" ")[0]} ${preset.hsl.split(" ")[1]} 35%) 100%)`,
              }}
            />
            <span>{preset.name}</span>
            {currentTheme === preset.hsl && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
