/**
 * Hold timer — counts up for isometric holds with animated ring.
 * Uses the single timer service; no setInterval in component.
 */

import { useCallback, useEffect, useState } from 'react'
import { timer } from '../../platform/timer'
import { Ring } from '../../ui/primitives'
import { Button } from '../../ui/primitives'

type HoldTimerProps = {
  targetSeconds: number
  onComplete: (heldSeconds: number) => void
  soundOn?: boolean
}

export const HoldTimer = ({
  targetSeconds,
  onComplete,
  soundOn = true,
}: HoldTimerProps): JSX.Element => {
  void soundOn
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)

  const tick = useCallback((secs: number) => {
    setElapsed(secs)
  }, [])

  const handleComplete = useCallback(() => {
    setRunning(false)
    onComplete(elapsed)
  }, [elapsed, onComplete])

  useEffect(() => {
    if (!running) return
    timer.start(targetSeconds, tick, handleComplete)
    return () => timer.stop()
  }, [running, targetSeconds, tick, handleComplete])

  const handleStart = () => {
    setRunning(true)
    setElapsed(0)
  }

  const handleStop = () => {
    timer.stop()
    setRunning(false)
    onComplete(elapsed)
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 paper-bg min-h-[300px] p-6">
      <Ring
        value={elapsed}
        max={targetSeconds}
        size={110}
        color={elapsed >= targetSeconds ? 'pine' : 'marigold'}
        label={`${elapsed}s held`}
        className="relative"
      />
      <div className="relative -top-16">
        <span className="font-mono text-5xl font-bold text-ink">{elapsed}</span>
        <span className="absolute -top-4 right-0 text-xs text-ink/40 font-mono">SECONDS</span>
      </div>
      <div className="flex items-center gap-3">
        {!running ? (
          <Button variant="primary" onClick={handleStart} className="h-12 w-20 px-4">
            Start Hold
          </Button>
        ) : (
          <Button variant="outline" onClick={handleStop} className="h-12 w-20 px-4 text-clay">
            Stop
          </Button>
        )}
      </div>
      <p className="text-sm text-ink/50">
        {running ? 'Hold the position — breathe steady' : `Target: ${targetSeconds}s`}
      </p>
    </div>
  )
}
