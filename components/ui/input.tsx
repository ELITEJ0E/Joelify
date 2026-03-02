import * as React from 'react'

import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Layout & shape
          'flex h-10 w-full rounded-md px-3 py-2',
          // Colours — Spotify uses a near-black fill, no visible border at rest
          'bg-zinc-800/80 text-sm text-foreground placeholder:text-zinc-500',
          // Border: barely visible at rest, brightens on hover
          'border border-zinc-700/50 hover:border-zinc-500/70',
          // Focus: clean single ring, no double outline
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent',
          // File input
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
          // States
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Smooth transitions
          'transition-colors duration-150',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
