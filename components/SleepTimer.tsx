"use client"

import { useState, useEffect, useRef } from "react"
import { Clock, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

interface SleepTimerProps {
  onTimerEnd: () => void
  isPlaying: boolean
}

export function SleepTimer({ onTimerEnd, isPlaying }: SleepTimerProps) {
  const [isActive, setIsActive] = useState(false)
  const [duration, setDuration] = useState(30) // in minutes
  const [timeRemaining, setTimeRemaining] = useState(0) // in seconds
  const [fadeOut, setFadeOut] = useState(true)
  const [stopAtTrackEnd, setStopAtTrackEnd] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!isActive) return

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleTimerEnd()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isActive])

  const handleTimerEnd = () => {
    console.log("[SleepTimer] Timer ended")
    setIsActive(false)

    if (fadeOut) {
      // Fade out over 5 seconds before stopping
      console.log("[SleepTimer] Starting fade out")
      // This would need to be implemented with volume control
      setTimeout(() => {
        onTimerEnd()
      }, 5000)
    } else {
      onTimerEnd()
    }

    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
  }

  const startTimer = () => {
    const seconds = duration * 60
    setTimeRemaining(seconds)
    setIsActive(true)
    console.log("[SleepTimer] Started:", duration, "minutes")
  }

  const cancelTimer = () => {
    setIsActive(false)
    setTimeRemaining(0)
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    console.log("[SleepTimer] Cancelled")
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    }
    return `${mins}:${String(secs).padStart(2, "0")}`
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white relative">
          <Moon size={20} />
          {isActive && <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse" />}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-96">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Clock size={20} />
            Sleep Timer
          </SheetTitle>
          <SheetDescription>
            {isActive
              ? "Timer is active. Music will stop automatically."
              : "Set a timer to automatically pause playback."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isActive ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-6xl font-bold text-primary mb-4">{formatTime(timeRemaining)}</div>
              <p className="text-sm text-muted-foreground mb-6">Time remaining</p>
              <Button onClick={cancelTimer} variant="destructive" className="w-full">
                Cancel Timer
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Duration</Label>
                <Select value={String(duration)} onValueChange={(val) => setDuration(Number(val))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Fade Out</Label>
                  <p className="text-xs text-muted-foreground">Gradually decrease volume before stopping</p>
                </div>
                <Switch checked={fadeOut} onCheckedChange={setFadeOut} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Stop at Track End</Label>
                  <p className="text-xs text-muted-foreground">Wait for current track to finish</p>
                </div>
                <Switch checked={stopAtTrackEnd} onCheckedChange={setStopAtTrackEnd} />
              </div>

              <Button onClick={startTimer} className="w-full" disabled={!isPlaying}>
                <Clock className="mr-2" size={16} />
                Start Sleep Timer
              </Button>

              {!isPlaying && (
                <p className="text-xs text-center text-muted-foreground">Start playing music to enable sleep timer</p>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
