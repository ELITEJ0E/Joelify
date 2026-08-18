"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useMotionValue, animate, type MotionValue, type AnimationPlaybackControls, useReducedMotion } from "framer-motion"

export type SheetState = "none" | "player" | "lyrics" | "queue"

export interface UseSheetNavigationOptions {
  onStateChange?: (state: SheetState) => void
  onNext?: () => void
  onPrevious?: () => void
}

export function useSheetNavigation(options: UseSheetNavigationOptions = {}) {
  // Authoritative Navigation State
  const [sheetState, setSheetStateInternal] = useState<SheetState>("none")
  const sheetStateRef = useRef<SheetState>("none")

  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  // Synchronize ref
  useEffect(() => {
    sheetStateRef.current = sheetState
    optionsRef.current.onStateChange?.(sheetState)
  }, [sheetState])

  const shouldReduceMotion = useReducedMotion()

  // ── MotionValues for Continuous Positions ──────────────────────────────────
  // playerY: 0 (closed/none) -> 1 (fully expanded player)
  const playerY = useMotionValue<number>(0)
  // lyricsY: 0 (closed/on player) -> 1 (fully open lyrics)
  const lyricsY = useMotionValue<number>(0)
  // queueX: 0 (closed/on player) -> 1 (fully open queue)
  const queueX = useMotionValue<number>(0)
  // trackX: horizontal offset for mini-bar song swipe
  const trackX = useMotionValue<number>(0)

  // Active animation controls to allow instant interruption
  const playerAnimRef = useRef<AnimationPlaybackControls | null>(null)
  const lyricsAnimRef = useRef<AnimationPlaybackControls | null>(null)
  const queueAnimRef = useRef<AnimationPlaybackControls | null>(null)
  const trackAnimRef = useRef<AnimationPlaybackControls | null>(null)

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
    if (trackAnimRef.current) {
      trackAnimRef.current.stop()
      trackAnimRef.current = null
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
        // Ensure motion values align exactly with target
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

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getDimensions = useCallback(() => {
    const vh = typeof window !== "undefined" ? window.innerHeight : 800
    const vw = typeof window !== "undefined" ? window.innerWidth : 800
    return { vh, vw }
  }, [])

  // ── UNIFIED POINTER GESTURE STATE ──────────────────────────────────────────
  const gestureRef = useRef<{
    active: boolean
    pointerId: number | null
    target: "mini" | "player" | "lyrics" | "queue" | null
    startX: number
    startY: number
    lastX: number
    lastY: number
    lastTime: number
    velocityX: number
    velocityY: number
    initPlayerY: number
    initLyricsY: number
    initQueueX: number
    initTrackX: number
    mode: "vertical" | "horizontal" | "player-down" | "lyrics-up" | "queue-left" | "lyrics-down" | "queue-right" | null
    hasMoved: boolean
    isHeaderDrag?: boolean
  }>({
    active: false,
    pointerId: null,
    target: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    velocityX: 0,
    velocityY: 0,
    initPlayerY: 0,
    initLyricsY: 0,
    initQueueX: 0,
    initTrackX: 0,
    mode: null,
    hasMoved: false,
  })

  // ── 1. MINI PLAYER BAR GESTURES ───────────────────────────────────────────
  const handleMiniPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return
    const target = e.target as HTMLElement
    if (target.closest('button, input, [role="slider"], .slider-thumb, a, [data-no-drag="true"]')) {
      return
    }

    stopAllAnimations()

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch (err) {}

    const now = performance.now()
    gestureRef.current = {
      active: true,
      pointerId: e.pointerId,
      target: "mini",
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastTime: now,
      velocityX: 0,
      velocityY: 0,
      initPlayerY: playerY.get(),
      initLyricsY: lyricsY.get(),
      initQueueX: queueX.get(),
      initTrackX: trackX.get(),
      mode: null,
      hasMoved: false,
    }
  }, [playerY, lyricsY, queueX, trackX, stopAllAnimations])

  const handleMiniPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const g = gestureRef.current
    if (!g.active || g.pointerId !== e.pointerId || g.target !== "mini") return

    const now = performance.now()
    const dt = Math.max(1, now - g.lastTime)
    const vx = ((e.clientX - g.lastX) / dt) * 1000
    const vy = ((e.clientY - g.lastY) / dt) * 1000
    g.velocityX = vx
    g.velocityY = vy
    g.lastX = e.clientX
    g.lastY = e.clientY
    g.lastTime = now

    const dx = e.clientX - g.startX
    const dy = e.clientY - g.startY
    const absX = Math.abs(dx)
    const absY = Math.abs(dy)

    if (g.mode === null) {
      if (absY >= 6 || absX >= 6) {
        g.hasMoved = true
        if (absY >= absX) {
          g.mode = "vertical"
        } else {
          g.mode = "horizontal"
        }
      }
    }

    const { vh } = getDimensions()

    if (g.mode === "vertical") {
      // dy < 0 pulls upward to open Player -> playerY moves 0 to 1
      const nextY = Math.max(0, Math.min(1, g.initPlayerY + (-dy) / vh))
      playerY.set(nextY)
    } else if (g.mode === "horizontal") {
      trackX.set(g.initTrackX + dx)
    }
  }, [playerY, trackX, getDimensions])

  const handleMiniPointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const g = gestureRef.current
    if (!g.active || g.pointerId !== e.pointerId || g.target !== "mini") return
    g.active = false

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch (err) {}

    const dx = e.clientX - g.startX
    const { vh } = getDimensions()

    if (!g.hasMoved) {
      openPlayer()
      return
    }

    if (g.mode === "vertical") {
      const currentY = playerY.get()
      if (currentY > 0.25 || g.velocityY < -300) {
        transitionTo("player", true, -g.velocityY / vh)
      } else {
        transitionTo("none", true, -g.velocityY / vh)
      }
    } else if (g.mode === "horizontal") {
      const springConfig = shouldReduceMotion ? { duration: 0.15 } : { type: "spring" as const, stiffness: 350, damping: 30 }
      if (dx < -50 || g.velocityX < -300) {
        // Next track
        animate(trackX, -150, { duration: 0.12, ease: "easeOut" }).then(() => {
          optionsRef.current.onNext?.()
          trackX.set(120)
          animate(trackX, 0, springConfig)
        })
      } else if (dx > 50 || g.velocityX > 300) {
        // Prev track
        animate(trackX, 150, { duration: 0.12, ease: "easeOut" }).then(() => {
          optionsRef.current.onPrevious?.()
          trackX.set(-120)
          animate(trackX, 0, springConfig)
        })
      } else {
        animate(trackX, 0, springConfig)
      }
    }
  }, [playerY, trackX, openPlayer, transitionTo, getDimensions, shouldReduceMotion])

  // ── 2. MAIN PLAYER GESTURES ───────────────────────────────────────────────
  const handlePlayerPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return
    const target = e.target as HTMLElement
    if (target.closest('button, input, [role="slider"], .slider-thumb, a, [data-no-drag="true"]')) {
      return
    }
    if (sheetStateRef.current !== "player") return

    stopAllAnimations()

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch (err) {}

    const now = performance.now()
    gestureRef.current = {
      active: true,
      pointerId: e.pointerId,
      target: "player",
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastTime: now,
      velocityX: 0,
      velocityY: 0,
      initPlayerY: playerY.get(),
      initLyricsY: lyricsY.get(),
      initQueueX: queueX.get(),
      initTrackX: 0,
      mode: null,
      hasMoved: false,
    }
  }, [playerY, lyricsY, queueX, stopAllAnimations])

  const handlePlayerPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const g = gestureRef.current
    if (!g.active || g.pointerId !== e.pointerId || g.target !== "player") return

    const now = performance.now()
    const dt = Math.max(1, now - g.lastTime)
    const vx = ((e.clientX - g.lastX) / dt) * 1000
    const vy = ((e.clientY - g.lastY) / dt) * 1000
    g.velocityX = vx
    g.velocityY = vy
    g.lastX = e.clientX
    g.lastY = e.clientY
    g.lastTime = now

    const dx = e.clientX - g.startX
    const dy = e.clientY - g.startY
    const absX = Math.abs(dx)
    const absY = Math.abs(dy)

    if (g.mode === null) {
      if (absY >= 6 || absX >= 6) {
        g.hasMoved = true
        if (absY >= absX) {
          if (dy > 0) {
            g.mode = "player-down"
          } else {
            g.mode = "lyrics-up"
          }
        } else {
          if (dx < 0) {
            g.mode = "queue-left"
          }
        }
      }
    }

    const { vh, vw } = getDimensions()

    if (g.mode === "player-down") {
      const nextY = Math.max(0, Math.min(1, g.initPlayerY - dy / vh))
      playerY.set(nextY)
    } else if (g.mode === "lyrics-up") {
      const nextL = Math.max(0, Math.min(1, g.initLyricsY + (-dy) / vh))
      lyricsY.set(nextL)
    } else if (g.mode === "queue-left") {
      const nextQ = Math.max(0, Math.min(1, g.initQueueX + (-dx) / vw))
      queueX.set(nextQ)
    }
  }, [playerY, lyricsY, queueX, getDimensions])

  const handlePlayerPointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const g = gestureRef.current
    if (!g.active || g.pointerId !== e.pointerId || g.target !== "player") return
    g.active = false

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch (err) {}

    if (!g.hasMoved || g.mode === null) return

    const { vh, vw } = getDimensions()

    if (g.mode === "player-down") {
      const currentY = playerY.get()
      if (currentY < 0.75 || g.velocityY > 350) {
        transitionTo("none", true, g.velocityY / vh)
      } else {
        transitionTo("player", true, -g.velocityY / vh)
      }
    } else if (g.mode === "lyrics-up") {
      const currentL = lyricsY.get()
      if (currentL > 0.25 || g.velocityY < -350) {
        transitionTo("lyrics", true, -g.velocityY / vh)
      } else {
        transitionTo("player", true, g.velocityY / vh)
      }
    } else if (g.mode === "queue-left") {
      const currentQ = queueX.get()
      if (currentQ > 0.25 || g.velocityX < -350) {
        transitionTo("queue", true, -g.velocityX / vw)
      } else {
        transitionTo("player", true, g.velocityX / vw)
      }
    }
  }, [playerY, lyricsY, queueX, transitionTo, getDimensions])

  // ── 3. LYRICS SHEET GESTURES ──────────────────────────────────────────────
  const handleLyricsPointerDown = useCallback((e: React.PointerEvent<HTMLElement>, isHeader = false) => {
    if (e.button !== 0 && e.pointerType === "mouse") return
    const target = e.target as HTMLElement
    if (target.closest('button, input, [role="slider"], a, [data-no-drag="true"]')) {
      return
    }
    if (sheetStateRef.current !== "lyrics") return

    // If not dragging from header, check if lyrics list is scrolled down
    if (!isHeader) {
      const scrollContainer = target.closest(".overflow-y-auto, [data-radix-scroll-area-viewport]")
      if (scrollContainer && scrollContainer.scrollTop > 3) {
        return
      }
    }

    stopAllAnimations()

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch (err) {}

    const now = performance.now()
    gestureRef.current = {
      active: true,
      pointerId: e.pointerId,
      target: "lyrics",
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastTime: now,
      velocityX: 0,
      velocityY: 0,
      initPlayerY: playerY.get(),
      initLyricsY: lyricsY.get(),
      initQueueX: queueX.get(),
      initTrackX: 0,
      mode: isHeader ? "lyrics-down" : null,
      hasMoved: false,
      isHeaderDrag: isHeader,
    }
  }, [playerY, lyricsY, queueX, stopAllAnimations])

  const handleLyricsPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const g = gestureRef.current
    if (!g.active || g.pointerId !== e.pointerId || g.target !== "lyrics") return

    const now = performance.now()
    const dt = Math.max(1, now - g.lastTime)
    const vy = ((e.clientY - g.lastY) / dt) * 1000
    g.velocityY = vy
    g.lastX = e.clientX
    g.lastY = e.clientY
    g.lastTime = now

    const dy = e.clientY - g.startY
    const dx = e.clientX - g.startX

    if (g.mode === null) {
      if (Math.abs(dy) >= 6 && Math.abs(dy) >= Math.abs(dx)) {
        if (dy > 0) {
          g.mode = "lyrics-down"
          g.hasMoved = true
        }
      }
    }

    const { vh } = getDimensions()

    if (g.mode === "lyrics-down" && dy > 0) {
      g.hasMoved = true
      const nextL = Math.max(0, Math.min(1, g.initLyricsY - dy / vh))
      lyricsY.set(nextL)
    }
  }, [lyricsY, getDimensions])

  const handleLyricsPointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const g = gestureRef.current
    if (!g.active || g.pointerId !== e.pointerId || g.target !== "lyrics") return
    g.active = false

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch (err) {}

    if (!g.hasMoved || g.mode !== "lyrics-down") return

    const { vh } = getDimensions()
    const currentL = lyricsY.get()

    if (currentL < 0.75 || g.velocityY > 350) {
      transitionTo("player", true, g.velocityY / vh)
    } else {
      transitionTo("lyrics", true, -g.velocityY / vh)
    }
  }, [lyricsY, transitionTo, getDimensions])

  // ── 4. QUEUE SHEET GESTURES ───────────────────────────────────────────────
  const handleQueuePointerDown = useCallback((e: React.PointerEvent<HTMLElement>, isHeader = false) => {
    if (e.button !== 0 && e.pointerType === "mouse") return
    const target = e.target as HTMLElement
    if (target.closest('button, input, a, [draggable="true"], [data-no-drag="true"]')) {
      return
    }
    if (sheetStateRef.current !== "queue") return

    stopAllAnimations()

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch (err) {}

    const now = performance.now()
    gestureRef.current = {
      active: true,
      pointerId: e.pointerId,
      target: "queue",
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastTime: now,
      velocityX: 0,
      velocityY: 0,
      initPlayerY: playerY.get(),
      initLyricsY: lyricsY.get(),
      initQueueX: queueX.get(),
      initTrackX: 0,
      mode: isHeader ? "queue-right" : null,
      hasMoved: false,
      isHeaderDrag: isHeader,
    }
  }, [playerY, lyricsY, queueX, stopAllAnimations])

  const handleQueuePointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const g = gestureRef.current
    if (!g.active || g.pointerId !== e.pointerId || g.target !== "queue") return

    const now = performance.now()
    const dt = Math.max(1, now - g.lastTime)
    const vx = ((e.clientX - g.lastX) / dt) * 1000
    g.velocityX = vx
    g.lastX = e.clientX
    g.lastY = e.clientY
    g.lastTime = now

    const dx = e.clientX - g.startX
    const dy = e.clientY - g.startY

    if (g.mode === null) {
      if (Math.abs(dx) >= 6 && Math.abs(dx) >= Math.abs(dy)) {
        if (dx > 0) {
          g.mode = "queue-right"
          g.hasMoved = true
        }
      } else if (Math.abs(dy) >= 8) {
        // Vertical scrolling inside queue list
        g.active = false
        return
      }
    }

    const { vw } = getDimensions()

    if (g.mode === "queue-right" && dx > 0) {
      g.hasMoved = true
      const nextQ = Math.max(0, Math.min(1, g.initQueueX - dx / vw))
      queueX.set(nextQ)
    }
  }, [queueX, getDimensions])

  const handleQueuePointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const g = gestureRef.current
    if (!g.active || g.pointerId !== e.pointerId || g.target !== "queue") return
    g.active = false

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch (err) {}

    if (!g.hasMoved || g.mode !== "queue-right") return

    const { vw } = getDimensions()
    const currentQ = queueX.get()

    if (currentQ < 0.75 || g.velocityX > 350) {
      transitionTo("player", true, g.velocityX / vw)
    } else {
      transitionTo("queue", true, -g.velocityX / vw)
    }
  }, [queueX, transitionTo, getDimensions])

  // ── Wheel Accumulator (Desktop / Trackpad continuous scroll gestures) ─────
  const wheelTimerRef = useRef<NodeJS.Timeout | null>(null)
  const wheelActiveTypeRef = useRef<"playerY" | "lyricsY" | "queueX" | null>(null)

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('input, [role="slider"], .slider-thumb, a, [data-no-drag="true"]')) {
        return
      }

      const currentState = sheetStateRef.current
      if (currentState === "none") return

      const { vh, vw } = getDimensions()
      const absX = Math.abs(e.deltaX)
      const absY = Math.abs(e.deltaY)

      stopAllAnimations()

      if (currentState === "player") {
        if (absY > absX && absY > 4) {
          if (e.deltaY < 0) {
            // Trackpad swipe down -> drag player toward closed
            wheelActiveTypeRef.current = "playerY"
            const current = playerY.get()
            const next = Math.max(0, Math.min(1, current - (-e.deltaY) / (vh * 0.75)))
            playerY.set(next)
          } else {
            // Trackpad swipe up -> drag lyrics into view
            wheelActiveTypeRef.current = "lyricsY"
            const current = lyricsY.get()
            const next = Math.max(0, Math.min(1, current + e.deltaY / (vh * 0.75)))
            lyricsY.set(next)
          }
        } else if (absX > absY && absX > 4) {
          if (e.deltaX > 0) {
            // Trackpad swipe left -> drag queue into view
            wheelActiveTypeRef.current = "queueX"
            const current = queueX.get()
            const next = Math.max(0, Math.min(1, current + e.deltaX / (vw * 0.75)))
            queueX.set(next)
          }
        }
      } else if (currentState === "lyrics") {
        const scrollEl = target.closest(".overflow-y-auto, [data-radix-scroll-area-viewport]")
        const isAtTop = !scrollEl || scrollEl.scrollTop <= 5
        if (isAtTop && e.deltaY < -4) {
          wheelActiveTypeRef.current = "lyricsY"
          const current = lyricsY.get()
          const next = Math.max(0, Math.min(1, current + e.deltaY / (vh * 0.75)))
          lyricsY.set(next)
        }
      } else if (currentState === "queue") {
        if (e.deltaX < -4) {
          wheelActiveTypeRef.current = "queueX"
          const current = queueX.get()
          const next = Math.max(0, Math.min(1, current + e.deltaX / (vw * 0.75)))
          queueX.set(next)
        }
      }

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
    [playerY, lyricsY, queueX, stopAllAnimations, transitionTo, getDimensions]
  )

  return {
    sheetState,
    setSheetState,
    playerY,
    lyricsY,
    queueX,
    trackX,
    openPlayer,
    closePlayer,
    openLyrics,
    closeLyrics,
    openQueue,
    closeQueue,
    transitionTo,
    stopAllAnimations,
    handleWheel,
    gestureRef,
    isSettlingRef,
    miniBarPointerHandlers: {
      onPointerDown: handleMiniPointerDown,
      onPointerMove: handleMiniPointerMove,
      onPointerUp: handleMiniPointerUp,
      onPointerCancel: handleMiniPointerUp,
    },
    playerPointerHandlers: {
      onPointerDown: handlePlayerPointerDown,
      onPointerMove: handlePlayerPointerMove,
      onPointerUp: handlePlayerPointerUp,
      onPointerCancel: handlePlayerPointerUp,
    },
    lyricsPointerHandlers: {
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => handleLyricsPointerDown(e, false),
      onPointerMove: handleLyricsPointerMove,
      onPointerUp: handleLyricsPointerUp,
      onPointerCancel: handleLyricsPointerUp,
    },
    lyricsHeaderPointerHandlers: {
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => handleLyricsPointerDown(e, true),
      onPointerMove: handleLyricsPointerMove,
      onPointerUp: handleLyricsPointerUp,
      onPointerCancel: handleLyricsPointerUp,
    },
    queuePointerHandlers: {
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => handleQueuePointerDown(e, false),
      onPointerMove: handleQueuePointerMove,
      onPointerUp: handleQueuePointerUp,
      onPointerCancel: handleQueuePointerUp,
    },
    queueHeaderPointerHandlers: {
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => handleQueuePointerDown(e, true),
      onPointerMove: handleQueuePointerMove,
      onPointerUp: handleQueuePointerUp,
      onPointerCancel: handleQueuePointerUp,
    },
  }
}
