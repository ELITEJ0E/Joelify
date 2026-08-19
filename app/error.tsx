"use client" // Error components must be Client Components

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("App Error:", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-black text-white p-4">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <p className="text-red-400 mb-6 text-sm max-w-md text-center">{error.message || "An unexpected error occurred."}</p>
      <Button
        onClick={() => reset()}
        className="px-6 py-2 bg-primary text-black font-semibold rounded-full hover:bg-primary/80 transition-colors"
      >
        Try again
      </Button>
    </div>
  )
}
