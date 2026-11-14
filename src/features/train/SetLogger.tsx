/**
 * Set logger — log reps/hold/level, RPE chips, per-set notes for one set.
 * One-handed layout: big input target, RPE chips 1-10, note field.
 */

import { useCallback, useState } from 'react'
import { Button } from '../../ui/primitives'
import { Badge } from '../../ui/primitives'
import type { SetLog, Metric } from '../../domain/index'
import type { RPE } from '../../domain/ids'
import { branded } from '../../domain/ids'

type SetLoggerProps = {
  exerciseId: string
  metric: Metric
  setIndex: number
  currentSet: SetLog
  onUpdate: (updates: Partial<SetLog>) => void
  onComplete?: () => void
}

export const SetLogger = ({
  exerciseId,
  metric,
  setIndex,
  currentSet,
  onUpdate,
  onComplete,
}: SetLoggerProps): JSX.Element => {
  void exerciseId
  void setIndex
  const [repsInput, setRepsInput] = useState(currentSet.reps?.toString() ?? '')
  const [holdInput, setHoldInput] = useState(currentSet.holdSeconds?.toString() ?? '')
  const [levelInput, setLevelInput] = useState(currentSet.level?.toString() ?? '')
  const [note, setNote] = useState(currentSet.note ?? '')

  const rpeOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

  const handleRepsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRepsInput(e.target.value)
    const val = e.target.value === '' ? undefined : Number(e.target.value)
    onUpdate({ reps: val })
  }, [onUpdate])

  const handleHoldChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setHoldInput(e.target.value)
    const val = e.target.value === '' ? undefined : Number(e.target.value)
    onUpdate({ holdSeconds: val })
  }, [onUpdate])

  const handleLevelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLevelInput(e.target.value)
    const val = e.target.value === '' ? undefined : Number(e.target.value)
    onUpdate({ level: val })
  }, [onUpdate])

  const handleRPE = useCallback((rpe: number) => {
    onUpdate({ rpe: branded<RPE>(rpe) })
  }, [onUpdate])

  const handleNoteChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNote(e.target.value)
    onUpdate({ note: e.target.value })
  }, [onUpdate])

  const handleToggleComplete = useCallback(() => {
    onUpdate({ completed: !currentSet.completed })
    if (!currentSet.completed && onComplete) onComplete()
  }, [currentSet.completed, onUpdate, onComplete])

  const isReps = metric === 'reps'
  const isHold = metric === 'hold-seconds'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-3">
        {isReps && (
          <div className="flex-1">
            <label className="block text-[11px] text-ink/40 font-mono uppercase mb-1">
              Reps
            </label>
            <input
              type="number"
              value={repsInput}
              onChange={handleRepsChange}
              className="w-full rounded-[14px] border border-ink/20 bg-white px-4 py-4 text-2xl font-mono font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
              min="0"
            />
          </div>
        )}
        {isHold && (
          <div className="flex-1">
            <label className="block text-[11px] text-ink/40 font-mono uppercase mb-1">
              Hold (sec)
            </label>
            <input
              type="number"
              value={holdInput}
              onChange={handleHoldChange}
              className="w-full rounded-[14px] border border-ink/20 bg-white px-4 py-4 text-2xl font-mono font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
              min="0"
            />
          </div>
        )}
        <div className="flex-1">
          <label className="block text-[11px] text-ink/40 font-mono uppercase mb-1">
            RPE
          </label>
          <div className="grid grid-cols-2 gap-1">
            {rpeOptions.map((rpe) => (
              <Button
                key={rpe}
                variant={currentSet.rpe === rpe ? 'primary' : 'outline'}
                onClick={() => handleRPE(rpe)}
                className="aspect-square text-xl font-mono"
              >
                {rpe}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-ink/10">
        <Button
          variant="ghost"
          onClick={handleToggleComplete}
          className="flex-1 justify-start text-left"
        >
          {currentSet.completed ? '✓ Set logged' : 'Log set'}
        </Button>
        {metric === 'level' && (
          <div className="flex-1">
            <label className="block text-[11px] text-ink/40 font-mono uppercase mb-1">
              Level
            </label>
            <input
              type="number"
              value={levelInput}
              onChange={handleLevelChange}
              className="w-full rounded-[14px] border border-ink/20 bg-white px-4 py-4 text-2xl font-mono font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
              min="0"
            />
          </div>
        )}
      </div>

      <div className="mt-2">
        <label className="block text-[11px] text-ink/40 font-mono uppercase mb-1">
          Note
        </label>
        <input
          value={note}
          onChange={handleNoteChange}
          placeholder="How did it feel?"
          className="w-full rounded-[14px] border border-ink/20 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
        />
      </div>

      <Badge variant={currentSet.rpe <= 6 ? 'pine' : currentSet.rpe <= 8 ? 'warn' : 'danger'}>
        RPE {currentSet.rpe}
      </Badge>
    </div>
  )
}
