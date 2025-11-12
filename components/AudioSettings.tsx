"use client"

import { useState, useEffect } from "react"
import { Settings, Music2 } from "lucide-react"
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
        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
          <Settings size={20} />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Music2 size={20} />
            Audio Settings
          </SheetTitle>
          <SheetDescription>
            Customize your audio experience with crossfade, equalizer, and quality settings.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="playback" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="playback">Playback</TabsTrigger>
            <TabsTrigger value="equalizer">Equalizer</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
          </TabsList>

          <TabsContent value="playback" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Crossfade Duration</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Smoothly blend tracks together ({localSettings.crossfadeDuration}s)
                </p>
                <Slider
                  value={[localSettings.crossfadeDuration]}
                  min={0}
                  max={12}
                  step={1}
                  onValueChange={handleCrossfadeChange}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Off</span>
                  <span>2s</span>
                  <span>6s</span>
                  <span>12s</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="equalizer" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">EQ Preset</Label>
                <Select value={localSettings.eqPreset} onValueChange={handleEQPresetChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(EQ_PRESETS).map((preset) => (
                      <SelectItem key={preset} value={preset}>
                        {preset}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-4 block">Custom Equalizer</Label>
                <div className="space-y-4">
                  {localSettings.customEQ.map((value, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground w-12">{FREQUENCY_BANDS[index]}</span>
                      <Slider
                        value={[value]}
                        min={-12}
                        max={12}
                        step={1}
                        onValueChange={(val) => handleCustomEQChange(index, val)}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {value > 0 ? "+" : ""}
                        {value}dB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="quality" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">YouTube Quality</Label>
                <Select value={localSettings.youtubeQuality} onValueChange={handleYouTubeQualityChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="audio">Audio Only (Best Battery)</SelectItem>
                    <SelectItem value="360p">360p</SelectItem>
                    <SelectItem value="720p">720p (Recommended)</SelectItem>
                    <SelectItem value="1080p">1080p (Highest)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">Higher quality uses more data and battery</p>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">Spotify Quality</Label>
                <Select value={localSettings.spotifyQuality} onValueChange={handleSpotifyQualityChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal (96 kbps)</SelectItem>
                    <SelectItem value="high">High (160 kbps)</SelectItem>
                    <SelectItem value="veryhigh">Very High (320 kbps)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">Premium required for Very High quality</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
