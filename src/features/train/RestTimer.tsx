/**
 * Rest timer — audible countdown with animated ring, skip and +30s.
 * Uses the single timer service and sound service.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { timer } from '../../platform/timer'
import { sound, resumeAudio } from '../../platform/sound'
import { Ring, Button } from '../../ui/primitives'

type RestTimerProps = {
  durationSeconds: number
  onComplete: () => void
  onSkip?: () => void
  soundOn?: boolean
}

export const RestTimer = ({
  durationSeconds,
  onComplete,
  onSkip,
  soundOn = true,
}: RestTimerProps): JSX.Element => {
  const [remaining, setRemaining] = useState(durationSeconds)
  const [paused, setPaused] = useState(false)
  const onCompleteRef = useRef(onComplete)
  const soundOnRef = useRef(soundOn)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])
  useEffect(() => {
    soundOnRef.current = soundOn
  }, [soundOn])

  const tick = useCallback((secs: number) => {
    setRemaining(secs)
  }, [])

  const handleComplete = useCallback(() => {
    if (soundOnRef.current) sound.restFinish()
    onCompleteRef.current()
  }, [])

  useEffect(() => {
    resumeAudio()
    timer.start(durationSeconds, tick, handleComplete)
    return () => timer.stop()
  }, [durationSeconds, tick, handleComplete])

  const handleSkip = () => {
    timer.stop()
    setPaused(true)
    setRemaining(0)
    onSkip?.()
  }

  const handleAdd30 = () => {
    setPaused(false)
    timer.start(remaining + 30, tick, handleComplete)
    setRemaining(remaining + 30)
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-[300px] p-6">
      <Ring
        value={durationSeconds - remaining}
        max={durationSeconds}
        size={110}
        color="pine"
        label={`${remaining} seconds of rest remaining`}
        className="relative"
      />
      <div className="relative -top-16" aria-hidden="true">
        <span className="font-mono text-5xl font-bold text-ink">{remaining}</span>
        <span className="absolute -top-4 right-0 text-xs text-ink/40 font-mono">SECONDS</span>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={handleAdd30} className="h-12 w-16 px-3">
          +30s
        </Button>
        <Button variant="ghost" onClick={handleSkip} className="h-12 w-16 px-3 text-ink/50">
          Skip
        </Button>
      </div>
      <p className="text-sm text-ink/50" aria-live="polite">
        {paused ? 'Rest skipped' : 'Recover — next set coming up'}
      </p>
    </div>
  )
}
