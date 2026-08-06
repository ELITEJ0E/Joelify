"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { useState, memo } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface TrackImageProps {
  src?: string | null
  alt?: string
  width?: number
  height?: number
  fill?: boolean
  className?: string
  referrerPolicy?: React.HTMLAttributeReferrerPolicy
}

export const TrackImage = memo(function TrackImage({ src, alt = "", width, height, fill, className, referrerPolicy = "no-referrer" }: TrackImageProps) {
  const isVideo = src?.toLowerCase().includes(".mp4") || src?.includes("video_upload")
  const url = src || "/placeholder.svg"
  
  const [isLoaded, setIsLoaded] = useState(false)

  // Extract Suno clip ID for a seamless high-res static poster image
  const uuidMatch = url.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/)
  const posterUrl = uuidMatch ? `https://cdn2.suno.ai/image_${uuidMatch[0]}.jpeg` : undefined

  return (
    <div 
      className={cn(
        "relative overflow-hidden", 
        !fill ? "flex-shrink-0" : "absolute inset-0 w-full h-full", 
        className
      )}
      style={!fill ? { width: width || 40, height: height || 40, minWidth: width || 40, minHeight: height || 40 } : undefined}
    >
      {!isLoaded && (
        <Skeleton className="absolute inset-0 w-full h-full bg-secondary/20 rendering-skeleton" />
      )}
      
      {isVideo ? (
        <video
          key={url}
          src={url}
          poster={posterUrl}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          onLoadedData={() => setIsLoaded(true)}
          style={{
            transform: 'translate3d(0, 0, 0)',
            backfaceVisibility: 'hidden',
            perspective: 1000,
            willChange: 'transform'
          }}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
        />
      ) : (
        <Image
          key={url}
          src={url}
          alt={alt}
          fill
          sizes={fill ? "100vw" : `${width || 40}px`}
          onLoad={() => setIsLoaded(true)}
          className={cn(
            "object-cover transition-opacity duration-500", 
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          referrerPolicy={referrerPolicy}
        />
      )}
    </div>
  )
})

