/**
 * Hold timer — counts up for isometric holds with animated ring.
 * Uses the single timer service; no setInterval in component.
 * Auto-completes when the target is reached, or stops early on demand.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { timer } from '../../platform/timer'
import { sound, resumeAudio } from '../../platform/sound'
import { Ring, Button } from '../../ui/primitives'

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
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const elapsedRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const soundOnRef = useRef(soundOn)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])
  useEffect(() => {
    soundOnRef.current = soundOn
  }, [soundOn])

  const tick = useCallback((secs: number) => {
    elapsedRef.current = secs
    setElapsed(secs)
  }, [])

  const handleComplete = useCallback(() => {
    setRunning(false)
    if (soundOnRef.current) sound.beep()
    onCompleteRef.current(elapsedRef.current)
  }, [])

  useEffect(() => {
    if (!running) return
    resumeAudio()
    timer.startCountUp(targetSeconds, tick, handleComplete)
    return () => timer.stop()
  }, [running, targetSeconds, tick, handleComplete])

  useEffect(() => () => timer.stop(), [])

  const handleStart = () => {
    elapsedRef.current = 0
    setElapsed(0)
    setRunning(true)
  }

  const handleStop = () => {
    timer.stop()
    setRunning(false)
    onCompleteRef.current(elapsedRef.current)
  }

  const done = elapsed >= targetSeconds

  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-[300px] p-6">
      <Ring
        value={Math.min(elapsed, targetSeconds)}
        max={targetSeconds}
        size={110}
        color={done ? 'pine' : 'marigold'}
        label={`${elapsed} of ${targetSeconds} seconds held`}
        className="relative"
      />
      <div className="relative -top-16" aria-hidden="true">
        <span className="font-mono text-5xl font-bold text-ink">{elapsed}</span>
        <span className="absolute -top-4 right-0 text-xs text-ink/40 font-mono">SECONDS</span>
      </div>
      <div className="flex items-center gap-3">
        {!running ? (
          <Button variant="primary" onClick={handleStart} className="h-12 w-24 px-4">
            Start hold
          </Button>
        ) : (
          <Button variant="outline" onClick={handleStop} className="h-12 w-24 px-4">
            Stop &amp; log
          </Button>
        )}
      </div>
      <p className="text-sm text-ink/50" aria-live="polite">
        {running ? 'Hold the position — breathe steady' : `Target: ${targetSeconds}s`}
      </p>
    </div>
  )
}
