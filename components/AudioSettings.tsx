"use client"

import React, { useState, useEffect } from "react"
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
  realAudioEngine: boolean
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

export const AudioSettings = React.forwardRef<HTMLButtonElement, AudioSettingsProps>(
  ({ settings, onChange }, ref) => {
    const [localSettings, setLocalSettings] = useState(settings)
    const [open, setOpen] = useState(false)

    useEffect(() => {
      if (open) {
        window.history.pushState({ modal: "audio-settings" }, "")
        const handlePopState = () => setOpen(false)
        window.addEventListener("popstate", handlePopState)
        return () => window.removeEventListener("popstate", handlePopState)
      }
    }, [open])

    const handleOpenChange = (isOpen: boolean) => {
      if (isOpen) {
        setOpen(true)
      } else {
        setOpen(false)
        if (window.history.state?.modal === "audio-settings") {
          window.history.back()
        }
      }
    }

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

    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>
          <Button ref={ref} variant="ghost" size="sm" className="p-2 text-gray-400 hover:text-white hover:bg-primary/15">
            <Settings size={18} />
          </Button>
        </SheetTrigger>

        <SheetContent className="w-full sm:w-[440px] overflow-y-auto px-5 py-4 bg-black/80 backdrop-blur-2xl border-white/[0.07]">
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
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Enable Real EQ & Beat Sync</Label>
                  <p className="text-xs text-muted-foreground">
                    Use custom audio engine for real EQ and visualizer beat sync.
                  </p>
                </div>
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={localSettings.realAudioEngine}
                    onChange={(e) => {
                      const newSettings = { ...localSettings, realAudioEngine: e.target.checked }
                      setLocalSettings(newSettings)
                      onChange(newSettings)
                    }}
                  />
                </div>
              </div>

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

              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-sm font-medium">Equalizer</Label>
                  <Select value={localSettings.eqPreset} onValueChange={handleEQPresetChange}>
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(EQ_PRESETS).map((preset) => (
                        <SelectItem key={preset} value={preset} className="text-xs">
                          {preset}
                        </SelectItem>
                      ))}
                      <SelectItem value="Custom" className="text-xs">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-between items-end h-32 gap-1 px-1">
                  {FREQUENCY_BANDS.map((band, index) => (
                    <div key={band} className="flex flex-col items-center gap-2 flex-1">
                      <div className="h-24 w-full flex justify-center py-2">
                        <Slider
                          orientation="vertical"
                          value={[localSettings.customEQ[index] || 0]}
                          min={-12}
                          max={12}
                          step={1}
                          onValueChange={(val) => handleCustomEQChange(index, val)}
                          className="h-full"
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground">{band}</span>
                    </div>
                  ))}
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
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    )
  }
)
AudioSettings.displayName = "AudioSettings"
