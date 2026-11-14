/**
 * Rest timer — audible countdown with animated ring, skip and +30s.
 * Uses the single timer service and sound service.
 */

import { useCallback, useEffect, useState } from 'react'
import { timer } from '../../platform/timer'
import { sound, resumeAudio } from '../../platform/sound'
import { Ring } from '../../ui/primitives'
import { Button } from '../../ui/primitives'

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
  const [running, setRunning] = useState(false)

  const tick = useCallback((secs: number) => {
    setRemaining(secs)
  }, [])

  const handleComplete = useCallback(() => {
    setRunning(false)
    if (soundOn) sound.restFinish()
    onComplete()
  }, [soundOn, onComplete])

  useEffect(() => {
    resumeAudio()
    timer.start(durationSeconds, tick, handleComplete)
    return () => timer.stop()
  }, [durationSeconds, tick, handleComplete])

  const handleSkip = () => {
    timer.stop()
    setRunning(false)
    setRemaining(0)
    onSkip?.()
  }

  const handleAdd30 = () => {
    timer.stop()
    timer.start(remaining + 30, tick, handleComplete)
    setRemaining(remaining + 30)
    setRunning(true)
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 paper-bg min-h-[300px] p-6">
      <Ring
        value={durationSeconds - remaining}
        max={durationSeconds}
        size={110}
        color="pine"
        label={`${remaining}s rest`}
        className="relative"
      />
      <div className="relative -top-16">
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
      <p className="text-sm text-ink/50">
        {running ? 'Recover — next set coming up' : 'Rest complete'}
      </p>
    </div>
  )
}
