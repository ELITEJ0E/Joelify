"use client"

import type React from "react"

import { useState } from "react"
import { useApp } from "@/contexts/AppContext"
import { GripVertical, X } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

export function QueueSheet({ onClose }: { onClose: () => void }) {
  const { queue, setQueue, removeFromQueue, currentTrack } = useApp()
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newQueue = [...queue]
    const draggedTrack = newQueue[draggedIndex]
    newQueue.splice(draggedIndex, 1)
    newQueue.splice(index, 0, draggedTrack)

    setQueue(newQueue)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return
    const touchEndX = e.touches[0].clientX
    const diffX = touchEndX - touchStartX

    // Check if swipe is significant (e.g., 50px) and to the right
    if (diffX > 50) {
      onClose()
      setTouchStartX(null)
    }
  }

  const handleTouchEnd = () => {
    setTouchStartX(null)
  }

  return (
    <div
      className="flex flex-col h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Now Playing</h3>
        {currentTrack ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <Image
              src={currentTrack.thumbnail || "/placeholder.svg"}
              width={48}
              height={48}
              alt={currentTrack.title}
              className="rounded"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-1">{currentTrack.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">{currentTrack.artist}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No track playing</p>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Next in Queue ({queue.length})</h3>
        {queue.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Queue is empty</p>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-1 pr-4">
              {queue.map((track, index) => (
                <div
                  key={`${track.id}-${index}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-2 rounded-lg hover:bg-secondary group cursor-move transition-colors ${
                    draggedIndex === index ? "opacity-50" : ""
                  }`}
                >
                  <GripVertical
                    size={16}
                    className="text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0"
                  />
                  <Image
                    src={track.thumbnail || "/placeholder.svg"}
                    width={40}
                    height={40}
                    alt={track.title}
                    className="rounded flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{track.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{track.artist}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeFromQueue(index)}
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 flex-shrink-0"
                  >
                    <X size={16} />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
