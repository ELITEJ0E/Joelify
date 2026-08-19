"use client"

import { useState, useEffect } from "react"
import { Palette, Check, Music, Droplets } from "lucide-react"
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
  const [surfaceStyle, setSurfaceStyle] = useState<"joelify" | "liquid-glass">("joelify")

  useEffect(() => {
    const savedAccent = localStorage.getItem("theme-accent")
    if (savedAccent) {
      setCurrentTheme(savedAccent)
      applyTheme(savedAccent)
    }

    const savedSurface = localStorage.getItem("theme-surface")
    if (savedSurface === "liquid-glass" || savedSurface === "joelify") {
      applySurface(savedSurface as "joelify" | "liquid-glass")
    } else {
      const savedGlass = localStorage.getItem("theme-liquid-glass")
      if (savedGlass === "true") {
        applySurface("liquid-glass")
      } else {
        applySurface("joelify")
      }
    }
  }, [])

  const applySurface = (style: "joelify" | "liquid-glass") => {
    setSurfaceStyle(style)
    const isGlass = style === "liquid-glass"
    document.documentElement.setAttribute("data-surface", style)
    document.documentElement.classList.toggle("theme-liquid-glass", isGlass)
    localStorage.setItem("theme-surface", style)
    localStorage.setItem("theme-liquid-glass", isGlass ? "true" : "false")
  }

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
        className="w-64 max-h-80 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] bg-black/85 backdrop-blur-2xl border-white/[0.1] shadow-2xl p-2"
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold px-2">
          Surface Style
        </DropdownMenuLabel>

        <div className="space-y-0.5 mt-1 mb-2">
          <DropdownMenuItem
            onClick={() => applySurface("joelify")}
            className="flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer hover:bg-white/[0.08]"
          >
            <div className="flex items-center gap-2">
              <Music size={16} className="text-zinc-400 shrink-0" />
              <span className="text-xs text-white/90">Joelify (Default)</span>
            </div>
            {surfaceStyle === "joelify" && <Check size={14} className="text-primary" />}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => applySurface("liquid-glass")}
            className="flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer hover:bg-white/[0.08]"
          >
            <div className="flex items-center gap-2">
              <Droplets size={16} className="text-blue-300 shrink-0" />
              <span className="text-xs text-white/90">Liquid Glass</span>
            </div>
            {surfaceStyle === "liquid-glass" && <Check size={14} className="text-primary" />}
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="bg-white/10 my-2" />

        <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold px-2">
          Accent Color
        </DropdownMenuLabel>

        <div className="space-y-0.5 mt-1">
          {THEME_PRESETS.map((preset) => (
            <DropdownMenuItem
              key={preset.name}
              onClick={() => applyTheme(preset.hsl)}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer hover:bg-white/[0.08]"
            >
              <div
                className={`w-4 h-4 rounded-full border border-white/20 shrink-0 ${
                  currentTheme === preset.hsl ? "ring-2 ring-primary ring-offset-1 ring-offset-black" : ""
                }`}
                style={{
                  background: `linear-gradient(135deg, 
                    hsl(${preset.hsl}) 0%, 
                    hsl(${preset.hsl.split(" ")[0]} ${preset.hsl.split(" ")[1]} 35%) 100%)`,
                }}
              />
              <span className="text-xs text-white/90">{preset.name}</span>
              {currentTheme === preset.hsl && (
                <Check size={14} className="ml-auto text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

