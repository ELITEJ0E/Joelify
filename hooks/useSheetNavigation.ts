"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useMotionValue, animate, type MotionValue, type AnimationPlaybackControls, useReducedMotion } from "framer-motion"

export type SheetState = "none" | "player" | "lyrics" | "queue"

interface UseSheetNavigationOptions {
  onStateChange?: (state: SheetState) => void
}

export function useSheetNavigation(options: UseSheetNavigationOptions = {}) {
  // Authoritative Navigation State
  const [sheetState, setSheetStateInternal] = useState<SheetState>("none")
  const sheetStateRef = useRef<SheetState>("none")

  // Synchronize ref
  useEffect(() => {
    sheetStateRef.current = sheetState
    options.onStateChange?.(sheetState)
  }, [sheetState, options])

  const shouldReduceMotion = useReducedMotion()

  // ── MotionValues for Continuous Positions ──────────────────────────────────
  // playerY: 0 (closed/none) -> 1 (fully expanded player)
  const playerY = useMotionValue<number>(0)
  // lyricsY: 0 (closed/on player) -> 1 (fully open lyrics)
  const lyricsY = useMotionValue<number>(0)
  // queueX: 0 (closed/on player) -> 1 (fully open queue)
  const queueX = useMotionValue<number>(0)

  // Active animation controls to allow instant interruption
  const playerAnimRef = useRef<AnimationPlaybackControls | null>(null)
  const lyricsAnimRef = useRef<AnimationPlaybackControls | null>(null)
  const queueAnimRef = useRef<AnimationPlaybackControls | null>(null)

  const stopAllAnimations = useCallback(() => {
    if (playerAnimRef.current) {
      playerAnimRef.current.stop()
      playerAnimRef.current = null
    }
    if (lyricsAnimRef.current) {
      lyricsAnimRef.current.stop()
      lyricsAnimRef.current = null
    }
    if (queueAnimRef.current) {
      queueAnimRef.current.stop()
      queueAnimRef.current = null
    }
  }, [])

  // Guard flag for user-initiated history navigation vs browser popstate
  const isHandlingPopStateRef = useRef(false)
  const isSettlingRef = useRef(false)

  // ── Spring Animator ────────────────────────────────────────────────────────
  const springTo = useCallback(
    (
      mv: MotionValue<number>,
      target: number,
      velocity = 0,
      onComplete?: () => void
    ): AnimationPlaybackControls => {
      if (shouldReduceMotion) {
        return animate(mv, target, {
          duration: 0.18,
          ease: "easeOut",
          onComplete,
        })
      }
      return animate(mv, target, {
        type: "spring",
        stiffness: 380,
        damping: 34,
        mass: 0.8,
        velocity,
        onComplete,
      })
    },
    [shouldReduceMotion]
  )

  // ── Authoritative State Transition & Animation ─────────────────────────────
  const transitionTo = useCallback(
    (target: SheetState, userInitiated = true, velocity = 0) => {
      const current = sheetStateRef.current
      if (current === target && !isSettlingRef.current) {
        // Ensure motion values align
        if (target === "none") {
          playerY.set(0)
          lyricsY.set(0)
          queueX.set(0)
        } else if (target === "player") {
          playerY.set(1)
          lyricsY.set(0)
          queueX.set(0)
        } else if (target === "lyrics") {
          playerY.set(1)
          lyricsY.set(1)
          queueX.set(0)
        } else if (target === "queue") {
          playerY.set(1)
          lyricsY.set(0)
          queueX.set(1)
        }
        return
      }

      stopAllAnimations()
      isSettlingRef.current = true

      // Synchronize History Stack (Forward or Backward)
      if (userInitiated && typeof window !== "undefined") {
        if (target === "player" && current === "none") {
          if (window.history.state?.view !== "player") {
            window.history.pushState({ view: "player" }, "")
          }
        } else if (target === "lyrics" && current === "player") {
          if (window.history.state?.view !== "lyrics") {
            window.history.pushState({ view: "lyrics" }, "")
          }
        } else if (target === "queue" && current === "player") {
          if (window.history.state?.view !== "queue") {
            window.history.pushState({ view: "queue" }, "")
          }
        } else if (
          (target === "player" && (current === "lyrics" || current === "queue")) ||
          (target === "none" && current !== "none")
        ) {
          // Navigating back
          const historyView = window.history.state?.view
          if (historyView === "lyrics" || historyView === "queue" || historyView === "player") {
            isHandlingPopStateRef.current = true
            window.history.back()
          }
        }
      }

      const commit = () => {
        isSettlingRef.current = false
        sheetStateRef.current = target
        setSheetStateInternal(target)
      }

      let completedCount = 0
      const checkDone = (expected: number) => {
        completedCount++
        if (completedCount >= expected) {
          commit()
        }
      }

      if (target === "none") {
        // Close everything down to none
        const needsLyrics = lyricsY.get() > 0.01
        const needsQueue = queueX.get() > 0.01
        const total = 1 + (needsLyrics ? 1 : 0) + (needsQueue ? 1 : 0)

        playerAnimRef.current = springTo(playerY, 0, velocity, () => checkDone(total))
        if (needsLyrics) {
          lyricsAnimRef.current = springTo(lyricsY, 0, 0, () => checkDone(total))
        }
        if (needsQueue) {
          queueAnimRef.current = springTo(queueX, 0, 0, () => checkDone(total))
        }
      } else if (target === "player") {
        const needsPlayer = Math.abs(playerY.get() - 1) > 0.01
        const needsLyrics = lyricsY.get() > 0.01
        const needsQueue = queueX.get() > 0.01
        const total = (needsPlayer ? 1 : 0) + (needsLyrics ? 1 : 0) + (needsQueue ? 1 : 0) || 1

        if (needsPlayer) {
          playerAnimRef.current = springTo(playerY, 1, velocity, () => checkDone(total))
        }
        if (needsLyrics) {
          lyricsAnimRef.current = springTo(lyricsY, 0, velocity, () => checkDone(total))
        }
        if (needsQueue) {
          queueAnimRef.current = springTo(queueX, 0, velocity, () => checkDone(total))
        }
        if (!needsPlayer && !needsLyrics && !needsQueue) {
          commit()
        }
      } else if (target === "lyrics") {
        const needsPlayer = Math.abs(playerY.get() - 1) > 0.01
        const needsQueue = queueX.get() > 0.01
        const total = 1 + (needsPlayer ? 1 : 0) + (needsQueue ? 1 : 0)

        lyricsAnimRef.current = springTo(lyricsY, 1, velocity, () => checkDone(total))
        if (needsPlayer) {
          playerAnimRef.current = springTo(playerY, 1, 0, () => checkDone(total))
        }
        if (needsQueue) {
          queueAnimRef.current = springTo(queueX, 0, 0, () => checkDone(total))
        }
      } else if (target === "queue") {
        const needsPlayer = Math.abs(playerY.get() - 1) > 0.01
        const needsLyrics = lyricsY.get() > 0.01
        const total = 1 + (needsPlayer ? 1 : 0) + (needsLyrics ? 1 : 0)

        queueAnimRef.current = springTo(queueX, 1, velocity, () => checkDone(total))
        if (needsPlayer) {
          playerAnimRef.current = springTo(playerY, 1, 0, () => checkDone(total))
        }
        if (needsLyrics) {
          lyricsAnimRef.current = springTo(lyricsY, 0, 0, () => checkDone(total))
        }
      }
    },
    [playerY, lyricsY, queueX, springTo, stopAllAnimations]
  )

  // ── Centralized PopState Handler ───────────────────────────────────────────
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (isHandlingPopStateRef.current) {
        isHandlingPopStateRef.current = false
        return
      }

      const view = e.state?.view
      if (view === "queue") {
        transitionTo("queue", false)
      } else if (view === "lyrics") {
        transitionTo("lyrics", false)
      } else if (view === "player" || view === "expandable") {
        transitionTo("player", false)
      } else {
        transitionTo("none", false)
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [transitionTo])

  // ── Direct programmatic state triggers ─────────────────────────────────────
  const openPlayer = useCallback(() => transitionTo("player", true), [transitionTo])
  const closePlayer = useCallback(() => transitionTo("none", true), [transitionTo])
  const openLyrics = useCallback(() => transitionTo("lyrics", true), [transitionTo])
  const closeLyrics = useCallback(() => transitionTo("player", true), [transitionTo])
  const openQueue = useCallback(() => transitionTo("queue", true), [transitionTo])
  const closeQueue = useCallback(() => transitionTo("player", true), [transitionTo])
  const setSheetState = useCallback((state: SheetState) => transitionTo(state, true), [transitionTo])

  // ── Unified Gesture Controller ─────────────────────────────────────────────
  // Tracks active pointer / touch / wheel dragging
  const gestureStateRef = useRef<{
    active: boolean
    type: "mini-up" | "player-down" | "player-lyrics-up" | "player-queue-left" | "lyrics-down" | "queue-right" | null
    startX: number
    startY: number
    lastX: number
    lastY: number
    lastTime: number
    velocityX: number
    velocityY: number
    initialPlayerY: number
    initialLyricsY: number
    initialQueueX: number
    locked: boolean
  }>({
    active: false,
    type: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    velocityX: 0,
    velocityY: 0,
    initialPlayerY: 0,
    initialLyricsY: 0,
    initialQueueX: 0,
    locked: false,
  })

  // Wheel accumulator
  const wheelTimerRef = useRef<NodeJS.Timeout | null>(null)
  const wheelActiveTypeRef = useRef<"playerY" | "lyricsY" | "queueX" | null>(null)

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      // Ignore wheel events originating inside interactive controls
      const target = e.target as HTMLElement
      if (target.closest('input, [role="slider"], .slider-thumb, a')) {
        return
      }

      const currentState = sheetStateRef.current
      if (currentState === "none") return

      const vh = typeof window !== "undefined" ? window.innerHeight : 800
      const vw = typeof window !== "undefined" ? window.innerWidth : 800

      const absX = Math.abs(e.deltaX)
      const absY = Math.abs(e.deltaY)

      stopAllAnimations()

      if (currentState === "player") {
        if (absY > absX && absY > 4) {
          if (e.deltaY < 0) {
            // Wheel UP / Trackpad swipe DOWN -> dragging Player toward none
            wheelActiveTypeRef.current = "playerY"
            const current = playerY.get()
            const next = Math.max(0, Math.min(1, current - (-e.deltaY) / (vh * 0.75)))
            playerY.set(next)
          } else {
            // Wheel DOWN / Trackpad swipe UP -> dragging Lyrics into view
            wheelActiveTypeRef.current = "lyricsY"
            const current = lyricsY.get()
            const next = Math.max(0, Math.min(1, current + e.deltaY / (vh * 0.75)))
            lyricsY.set(next)
          }
        } else if (absX > absY && absX > 4) {
          if (e.deltaX > 0) {
            // Wheel RIGHT / Trackpad swipe LEFT -> dragging Queue into view
            wheelActiveTypeRef.current = "queueX"
            const current = queueX.get()
            const next = Math.max(0, Math.min(1, current + e.deltaX / (vw * 0.75)))
            queueX.set(next)
          }
        }
      } else if (currentState === "lyrics") {
        // If scrolling upward at top of lyrics -> drag lyrics down toward player
        const scrollEl = target.closest(".overflow-y-auto, [data-radix-scroll-area-viewport]")
        const isAtTop = !scrollEl || scrollEl.scrollTop <= 5
        if (isAtTop && e.deltaY < -4) {
          wheelActiveTypeRef.current = "lyricsY"
          const current = lyricsY.get()
          const next = Math.max(0, Math.min(1, current + e.deltaY / (vh * 0.75)))
          lyricsY.set(next)
        }
      } else if (currentState === "queue") {
        // If scrolling leftward in queue -> drag queue right toward player
        if (e.deltaX < -4) {
          wheelActiveTypeRef.current = "queueX"
          const current = queueX.get()
          const next = Math.max(0, Math.min(1, current + e.deltaX / (vw * 0.75)))
          queueX.set(next)
        }
      }

      // Debounce settling after trackpad / wheel release
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current)
      wheelTimerRef.current = setTimeout(() => {
        const activeType = wheelActiveTypeRef.current
        wheelActiveTypeRef.current = null
        if (!activeType) return

        if (activeType === "playerY") {
          const val = playerY.get()
          if (val < 0.7) {
            transitionTo("none", true)
          } else {
            transitionTo("player", true)
          }
        } else if (activeType === "lyricsY") {
          const val = lyricsY.get()
          if (val > 0.3) {
            transitionTo("lyrics", true)
          } else {
            transitionTo("player", true)
          }
        } else if (activeType === "queueX") {
          const val = queueX.get()
          if (val > 0.3) {
            transitionTo("queue", true)
          } else {
            transitionTo("player", true)
          }
        }
      }, 120)
    },
    [playerY, lyricsY, queueX, stopAllAnimations, transitionTo]
  )

  return {
    sheetState,
    setSheetState,
    playerY,
    lyricsY,
    queueX,
    openPlayer,
    closePlayer,
    openLyrics,
    closeLyrics,
    openQueue,
    closeQueue,
    transitionTo,
    stopAllAnimations,
    handleWheel,
    gestureStateRef,
    isSettlingRef,
  }
}
