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
  { name: "Apple Red", hsl: "0 85% 60%" },
  { name: "Tidal Blue", hsl: "200 100% 50%" },
  { name: "Purple", hsl: "270 70% 60%" },
  { name: "Orange", hsl: "25 95% 53%" },
]

export function ThemeSettings() {
  const [currentTheme, setCurrentTheme] = useState(THEME_PRESETS[0].hsl)

  useEffect(() => {
    // Load saved theme from localStorage
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
          className="text-gray-400 hover:text-white h-8 w-8"
          aria-label="Theme settings"
        >
          <Palette size={18} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Theme Color</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEME_PRESETS.map((preset) => (
          <DropdownMenuItem
            key={preset.name}
            onClick={() => applyTheme(preset.hsl)}
            className="flex items-center gap-2"
          >
            <div
              className="w-4 h-4 rounded-full border border-border"
              style={{ backgroundColor: `hsl(${preset.hsl})` }}
            />
            <span>{preset.name}</span>
            {currentTheme === preset.hsl && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
