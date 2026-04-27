"use client"

import { useState } from "react"
import { Share2, Copy, Check, Twitter, Facebook, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useApp } from "@/contexts/AppContext"

interface ShareMenuProps {
  type: "track" | "playlist" | "stats"
  data?: any
  className?: string
}

export function ShareMenu({ type, data, className = "" }: ShareMenuProps) {
  const { currentTrack, playlists, currentPlaylistId } = useApp()
  const [copied, setCopied] = useState(false)

  const generateShareText = () => {
    if (type === "track" && currentTrack) {
      return `🎵 Now Playing: ${currentTrack.title} by ${currentTrack.artist}\n\nListening on Joelify`
    } else if (type === "playlist" && data) {
      return `📋 Check out my playlist "${data.name}" with ${data.tracks.length} tracks on Joelify!`
    } else if (type === "stats") {
      const history = JSON.parse(localStorage.getItem("listening_history") || "[]")
      const totalPlays = history.length
      const totalMinutes = Math.floor(history.reduce((sum: number, item: any) => sum + (item.duration || 0), 0) / 60)
      return `📊 My Joelify Stats:\n${totalPlays} tracks played\n${totalMinutes} minutes of music enjoyed!`
    }
    return "Check out Joelify Music Player!"
  }

  const generateShareUrl = () => {
    if (type === "track" && currentTrack) {
      // Generate a shareable link with track info encoded
      const params = new URLSearchParams({
        track: currentTrack.title,
        artist: currentTrack.artist,
        id: currentTrack.id,
      })
      return `${window.location.origin}?${params.toString()}`
    } else if (type === "playlist" && data) {
      // Generate playlist share link
      const playlistData = JSON.stringify(data)
      const encoded = btoa(playlistData)
      return `${window.location.origin}?playlist=${encoded}`
    }
    return window.location.origin
  }

  const handleCopyLink = async () => {
    const shareUrl = generateShareUrl()
    const shareText = generateShareText()
    const fullText = `${shareText}\n${shareUrl}`

    try {
      await navigator.clipboard.writeText(fullText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      
      toast.custom((t) => (
        <div className="bg-black/90 backdrop-blur-2xl border border-primary/40 p-4 rounded-xl shadow-[0_0_30px_rgba(34,197,94,0.15)] flex items-start gap-3 min-w-[320px] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-primary/20 p-2 rounded-lg">
            <Check size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-white">Link copied!</h4>
            <p className="text-xs text-gray-400 mt-1">Share link has been copied to your clipboard.</p>
          </div>
          <button 
            onClick={() => toast.dismiss(t)}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))
    } catch (error) {
      console.error("[Share] Failed to copy:", error)
    }
  }

  const handleShareToTwitter = () => {
    const text = generateShareText()
    const url = generateShareUrl()
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    window.open(twitterUrl, "_blank", "width=550,height=420")
  }

  const handleShareToFacebook = () => {
    const url = generateShareUrl()
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    window.open(facebookUrl, "_blank", "width=550,height=420")
  }

  const handleNativeShare = async () => {
    const shareText = generateShareText()
    const shareUrl = generateShareUrl()

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Joelify Music",
          text: shareText,
          url: shareUrl,
        })
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("[Share] Native share failed:", error)
        }
      }
    }
  }

  const canShare = type === "track" ? !!currentTrack : type === "playlist" ? !!data : true

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={`text-gray-400 hover:text-white hover:bg-primary/15 ${className}`}
          disabled={!canShare}
          aria-label="Share"
        >
          <Share2 size={20} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-black/80 backdrop-blur-2xl border-white/[0.07]">
        {navigator.share && (
          <>
            <DropdownMenuItem onClick={handleNativeShare} className="cursor-pointer">
              <Share2 className="mr-2 h-4 w-4" />
              Share via...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy Link
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleShareToTwitter} className="cursor-pointer">
          <Twitter className="mr-2 h-4 w-4" />
          Share on Twitter
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShareToFacebook} className="cursor-pointer">
          <Facebook className="mr-2 h-4 w-4" />
          Share on Facebook
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
