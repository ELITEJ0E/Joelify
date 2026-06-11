import Image from "next/image"
import { cn } from "@/lib/utils"
import { useState } from "react"
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

export function TrackImage({ src, alt = "", width, height, fill, className, referrerPolicy = "no-referrer" }: TrackImageProps) {
  const isVideo = src?.toLowerCase().includes(".mp4") || src?.includes("video_upload")
  const url = src || "/placeholder.svg"
  
  const [isLoaded, setIsLoaded] = useState(false)

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
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={() => setIsLoaded(true)}
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
}
