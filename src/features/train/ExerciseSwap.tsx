/**
 * ExerciseSwap — pick an easier or harder step along the same chain.
 * Lists valid targets with difficulty and target muscles; disabled
 * state explains why no swap is available in that direction.
 */

import { useMemo } from 'react'
import { Badge, Button, Card } from '../../ui/primitives'
import { exerciseById, chainById } from '../../content/index'
import { swapTarget } from '../../engine/swap'
import type { SwapDirection } from '../../engine/swap'

type ExerciseSwapProps = {
  exerciseId: string
  barEnabled: boolean
  /** Direction chosen by the user; the parent applies the swap. */
  onSwap: (direction: SwapDirection) => void
  onClose: () => void
}

const byId = (id: string) => exerciseById.get(id)

export const ExerciseSwap = ({
  exerciseId,
  barEnabled,
  onSwap,
  onClose,
}: ExerciseSwapProps): JSX.Element => {
  const { current, chain, easier, harder } = useMemo(() => {
    const current = byId(exerciseId)
    const chain = current?.chainId ? chainById.get(current.chainId) ?? null : null
    if (!current || !chain) return { current: null, chain: null, easier: null, harder: null }
    // exercise.step is 1-based; chain.steps is a 0-based array.
    const stepIndex =
      current.step != null
        ? current.step - 1
        : chain.steps.findIndex((s) => s.exerciseId === exerciseId)
    const ctx = { barEnabled, getExercise: byId }
    return {
      current,
      chain,
      easier: swapTarget(chain, stepIndex, 'easier', ctx),
      harder: swapTarget(chain, stepIndex, 'harder', ctx),
    }
  }, [exerciseId, barEnabled])

  if (!current || !chain) {
    return (
      <Card role="dialog" aria-label="Swap exercise" className="max-w-md w-full">
        <h3 className="font-display text-lg font-bold mb-1">Swap exercise</h3>
        <p className="text-sm text-ink/60 mb-4">
          This exercise is not part of a progression chain, so it can’t be swapped.
        </p>
        <Button variant="outline" onClick={onClose} className="h-11 px-4">
          Back
        </Button>
      </Card>
    )
  }

  const renderOption = (direction: SwapDirection, candidate: typeof easier) => {
    const label = direction === 'easier' ? 'Easier' : 'Harder'
    return (
      <div className="rounded-[14px] border border-ink/10 p-3">
        <p className="text-[11px] font-mono uppercase tracking-widest text-ink/40 mb-1">
          {label}
        </p>
        {candidate ? (
          <>
            <p className="font-display text-base font-bold">{candidate.exercise.name}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1 mb-3">
              <Badge variant="pine">Difficulty {candidate.exercise.difficulty}</Badge>
              <Badge variant="info">
                {candidate.exercise.metric === 'hold-seconds'
                  ? 'Hold'
                  : candidate.exercise.metric === 'level'
                    ? 'Level'
                    : 'Reps'}
              </Badge>
            </div>
            <p className="text-xs text-ink/50 mb-3">
              {candidate.exercise.targetMuscles.join(' · ')}
            </p>
            <Button
              variant="outline"
              className="h-11 px-4 w-full"
              onClick={() => onSwap(direction)}
            >
              Swap to {candidate.exercise.name}
            </Button>
          </>
        ) : (
          <p className="text-sm text-ink/50 py-1">
            {direction === 'easier'
              ? 'Already at the easiest step of this chain.'
              : 'Already at the hardest step of this chain.'}
          </p>
        )}
      </div>
    )
  }

  return (
    <Card role="dialog" aria-label="Swap exercise" className="max-w-md w-full">
      <h3 className="font-display text-lg font-bold mb-1">Swap exercise</h3>
      <p className="text-sm text-ink/60 mb-3">
        {chain.name} — step {current.step ?? '?'} of {chain.steps.length}
      </p>
      <div className="rounded-[14px] bg-ink/5 p-3 mb-4">
        <p className="text-sm font-bold">{current.name}</p>
        <div className="flex flex-wrap gap-2 mt-1">
          <Badge variant="pine">Difficulty {current.difficulty}</Badge>
        </div>
      </div>
      <div className="space-y-3">
        {renderOption('easier', easier)}
        {renderOption('harder', harder)}
      </div>
      <Button variant="ghost" onClick={onClose} className="h-11 px-4 mt-4 w-full">
        Keep {current.name}
      </Button>
    </Card>
  )
}
