/**
 * Single timer service — the only place setInterval may be used.
 * Components call start/stop/clear; no component owns intervals directly.
 */

type TickCallback = (remaining: number) => void
type CompleteCallback = () => void

let intervalId: ReturnType<typeof setInterval> | null = null
let duration = 0
let startTime = 0
let onTick: TickCallback | null = null
let onComplete: CompleteCallback | null = null

export const timer = {
  start(seconds: number, tick: TickCallback, complete: CompleteCallback): void {
    this.stop()
    duration = seconds
    onTick = tick
    onComplete = complete
    startTime = Date.now()
    onTick(seconds)
    intervalId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      const remaining = Math.max(0, duration - elapsed)
      onTick?.(remaining)
      if (remaining <= 0) {
        this.stop()
        onComplete?.()
      }
    }, 1000)
  },

  /**
   * Count-up mode for isometric holds: ticks elapsed seconds and
   * auto-completes once the target is reached.
   */
  startCountUp(seconds: number, tick: TickCallback, complete: CompleteCallback): void {
    this.stop()
    duration = seconds
    onTick = tick
    onComplete = complete
    startTime = Date.now()
    onTick(0)
    intervalId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      if (elapsed >= duration) {
        onTick?.(duration)
        this.stop()
        onComplete?.()
        return
      }
      onTick?.(elapsed)
    }, 1000)
  },

  stop(): void {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    onTick = null
    onComplete = null
  },

  clear(): void {
    this.stop()
  },
}
