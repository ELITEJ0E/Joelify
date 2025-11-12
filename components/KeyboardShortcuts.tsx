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
      { key: "→", action: "Seek forward 5s" },
      { key: "←", action: "Seek backward 5s" },
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
      { key: "?", action: "Show shortcuts" },
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
      if (e.key === "Escape" && open) setOpen(false)
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="xs" className="p-2 text-gray-400 hover:text-white">
          <Keyboard size={18} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl px-5 py-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5 text-base">
            <Keyboard size={18} />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-xs">
            Quick access to player controls
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          {shortcuts.map((section) => (
            <div key={section.category} className="space-y-2">
              <h3 className="font-semibold text-xs text-foreground">{section.category}</h3>
              <div className="space-y-1">
                {section.items.map((shortcut) => (
                  <div key={shortcut.key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{shortcut.action}</span>
                    <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-muted border border-border rounded">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-[11px] text-muted-foreground text-center">
            Press{" "}
            <kbd className="px-1 py-0.5 text-[10px] font-semibold bg-muted border border-border rounded">?</kbd> to
            toggle this panel
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
