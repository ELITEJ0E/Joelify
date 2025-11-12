"use client"

import { useState, useEffect } from "react"
import { Keyboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const shortcuts = [
  {
    category: "Playback",
    items: [
      { key: "Space", action: "Play / Pause" },
      { key: "→", action: "Seek forward 5 seconds" },
      { key: "←", action: "Seek backward 5 seconds" },
      { key: "N", action: "Next track" },
      { key: "P", action: "Previous track" },
    ],
  },
  {
    category: "Volume",
    items: [
      { key: "↑", action: "Increase volume" },
      { key: "↓", action: "Decrease volume" },
      { key: "M", action: "Mute / Unmute" },
    ],
  },
  {
    category: "Playback Modes",
    items: [
      { key: "S", action: "Toggle shuffle" },
      { key: "R", action: "Toggle repeat" },
      { key: "V", action: "Toggle video mode" },
    ],
  },
  {
    category: "Navigation",
    items: [
      { key: "Q", action: "Open queue" },
      { key: "L", action: "Open lyrics" },
      { key: "?", action: "Show keyboard shortcuts" },
    ],
  },
]

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.key === "?" || e.key === "/") && (e.shiftKey || e.key === "?")) {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === "Escape" && open) {
        setOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
          <Keyboard size={20} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard size={20} />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>Quick access to player controls with your keyboard</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {shortcuts.map((section) => (
            <div key={section.category} className="space-y-3">
              <h3 className="font-semibold text-sm text-foreground">{section.category}</h3>
              <div className="space-y-2">
                {section.items.map((shortcut) => (
                  <div key={shortcut.key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{shortcut.action}</span>
                    <kbd className="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted border border-border rounded">?</kbd> to
            toggle this panel
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
