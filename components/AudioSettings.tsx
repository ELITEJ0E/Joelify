"use client"

import { useState, useEffect } from "react"
import { Settings, Music2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export interface AudioSettings {
  crossfadeDuration: number
  gaplessPlayback: boolean
  eqPreset: string
  customEQ: number[]
  youtubeQuality: "audio" | "360p" | "720p" | "1080p"
  spotifyQuality: "normal" | "high" | "veryhigh"
}

interface AudioSettingsProps {
  settings: AudioSettings
  onChange: (settings: AudioSettings) => void
}

const EQ_PRESETS = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Rock: [5, 4, -1, -2, -1, 1, 3, 4, 4, 4],
  Pop: [-1, -1, 0, 2, 4, 4, 2, 0, -1, -1],
  Jazz: [4, 3, 1, 2, -2, -2, 0, 2, 3, 4],
  Classical: [5, 4, 3, 2, -2, -2, 0, 2, 3, 4],
  Electronic: [5, 4, 1, 0, -2, 2, 1, 2, 4, 5],
  HipHop: [5, 4, 1, 3, -1, -1, 1, -1, 2, 4],
  Acoustic: [5, 4, 3, 1, 2, 2, 3, 3, 4, 3],
  BassBoost: [8, 7, 6, 4, 2, 0, 0, 0, 0, 0],
  TrebleBoost: [0, 0, 0, 0, 2, 4, 6, 7, 8, 8],
  Vocal: [-2, -3, -2, 1, 4, 4, 3, 1, 0, -1],
}

const FREQUENCY_BANDS = ["32Hz", "64Hz", "125Hz", "250Hz", "500Hz", "1kHz", "2kHz", "4kHz", "8kHz", "16kHz"]

export function AudioSettings({ settings, onChange }: AudioSettingsProps) {
  const [localSettings, setLocalSettings] = useState(settings)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleCrossfadeChange = (value: number[]) => {
    const newSettings = { ...localSettings, crossfadeDuration: value[0] }
    setLocalSettings(newSettings)
    onChange(newSettings)
  }

  const handleEQPresetChange = (preset: string) => {
    const presetValues = EQ_PRESETS[preset as keyof typeof EQ_PRESETS] || EQ_PRESETS.Flat
    const newSettings = { ...localSettings, eqPreset: preset, customEQ: presetValues }
    setLocalSettings(newSettings)
    onChange(newSettings)
  }

  const handleCustomEQChange = (index: number, value: number[]) => {
    const newCustomEQ = [...localSettings.customEQ]
    newCustomEQ[index] = value[0]
    const newSettings = { ...localSettings, eqPreset: "Custom", customEQ: newCustomEQ }
    setLocalSettings(newSettings)
    onChange(newSettings)
  }

  const handleYouTubeQualityChange = (quality: string) => {
    const newSettings = { ...localSettings, youtubeQuality: quality as AudioSettings["youtubeQuality"] }
    setLocalSettings(newSettings)
    onChange(newSettings)
  }

  const handleSpotifyQualityChange = (quality: string) => {
    const newSettings = { ...localSettings, spotifyQuality: quality as AudioSettings["spotifyQuality"] }
    setLocalSettings(newSettings)
    onChange(newSettings)
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="p-2 text-gray-400 hover:text-white">
          <Settings size={18} />
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:w-[440px] overflow-y-auto px-5 py-4">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-1.5 text-base">
            <Music2 size={18} />
            Audio Settings
          </SheetTitle>
          <SheetDescription className="text-xs">
            Customize your audio experience with crossfade, EQ, and quality.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="playback" className="mt-4">
          <TabsList className="grid w-full grid-cols-2 text-xs">
            <TabsTrigger value="playback">Playback</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
          </TabsList>

          <TabsContent value="playback" className="space-y-4 mt-4">
            <div>
              <Label className="text-sm font-medium">Crossfade Duration</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Blend tracks smoothly ({localSettings.crossfadeDuration}s)
              </p>
              <Slider
                value={[localSettings.crossfadeDuration]}
                min={0}
                max={12}
                step={1}
                onValueChange={handleCrossfadeChange}
              />
              <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                <span>Off</span>
                <span>2s</span>
                <span>6s</span>
                <span>12s</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="quality" className="space-y-4 mt-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">YouTube Quality</Label>
              <p className="text-xs text-muted-foreground">
                YouTube quality auto-optimizes based on your connection for the best experience.
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Spotify Quality</Label>
              <Select value={localSettings.spotifyQuality} onValueChange={handleSpotifyQualityChange}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="veryhigh">Very High</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Note: Spotify quality is managed by your account settings.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
