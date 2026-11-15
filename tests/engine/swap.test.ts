/**
 * Swap engine tests — target selection rules for manual chain swaps.
 */

import { describe, expect, it } from 'vitest'
import { swapTarget } from '../../src/engine/swap'
import { exercises, exerciseById, chainById } from '../../src/content/index'
import { branded } from '../../src/domain/ids'
import type { ChainId, ExerciseId } from '../../src/domain/ids'
import type { Exercise, Chain } from '../../src/domain/index'

const byId = (id: string): Exercise | undefined => exerciseById.get(id)
const chain = (id: string): Chain => chainById.get(branded<ChainId>(id)) as Chain

describe('swapTarget', () => {
  it('returns the adjacent easier step when within difficulty ±1', () => {
    const pushup = chain('chain-pushup')
    const target = swapTarget(pushup, 2, 'easier', { barEnabled: false, getExercise: byId })
    expect(target).not.toBeNull()
    expect(target?.stepIndex).toBe(1)
    const current = byId(pushup.steps[2].exerciseId)
    expect(target?.exercise.difficulty).toBeLessThanOrEqual((current?.difficulty ?? 0) + 1)
    expect(target?.exercise.difficulty).toBeLessThan(current?.difficulty ?? 0)
  })

  it('returns the adjacent harder step when within difficulty ±1', () => {
    const pushup = chain('chain-pushup')
    const target = swapTarget(pushup, 0, 'harder', { barEnabled: false, getExercise: byId })
    expect(target).not.toBeNull()
    expect(target?.stepIndex).toBe(1)
  })

  it('returns null when already at the easiest step', () => {
    const pushup = chain('chain-pushup')
    const target = swapTarget(pushup, 0, 'easier', { barEnabled: false, getExercise: byId })
    expect(target).toBeNull()
  })

  it('returns null when already at the hardest step', () => {
    const pushup = chain('chain-pushup')
    const target = swapTarget(pushup, pushup.steps.length - 1, 'harder', {
      barEnabled: false,
      getExercise: byId,
    })
    expect(target).toBeNull()
  })

  it('skips bar-only steps when the bar is disabled', () => {
    // Synthetic chain: push steps with a bar-only step in the middle.
    const synthetic: Chain = {
      id: branded<ChainId>('chain-synthetic'),
      name: 'Synthetic',
      pattern: 'push',
      steps: [
        { step: 1, exerciseId: branded<ExerciseId>('syn-a'), unlockCriteria: [] },
        { step: 2, exerciseId: branded<ExerciseId>('syn-bar'), unlockCriteria: [] },
        { step: 3, exerciseId: branded<ExerciseId>('syn-far'), unlockCriteria: [] },
      ],
    }
    const lookup = new Map<string, Exercise>([
      ['syn-a', syntheticExercise('syn-a', 'push', 4, false)],
      ['syn-bar', syntheticExercise('syn-bar', 'push', 5, true)],
      ['syn-far', syntheticExercise('syn-far', 'push', 6, false)],
    ])
    const get = (id: string) => lookup.get(id)

    // Bar disabled: the bar-only step is skipped and the next push step is
    // more than one difficulty band away, so there is no valid target.
    expect(
      swapTarget(synthetic, 0, 'harder', { barEnabled: false, getExercise: get }),
    ).toBeNull()

    // Bar enabled: the bar-only step is a valid harder target.
    const withBar = swapTarget(synthetic, 0, 'harder', { barEnabled: true, getExercise: get })
    expect(withBar?.exercise.id).toBe('syn-bar')
  })

  it('allows non-bar steps regardless of the bar setting', () => {
    const pushup = chain('chain-pushup')
    const withoutBar = swapTarget(pushup, 0, 'harder', { barEnabled: false, getExercise: byId })
    const withBar = swapTarget(pushup, 0, 'harder', { barEnabled: true, getExercise: byId })
    expect(withoutBar?.exercise.id).toBe(withBar?.exercise.id)
    expect(withoutBar?.exercise.barOnly).toBe(false)
  })

  it('keeps the movement pattern consistent with the current exercise', () => {
    for (const c of chainById.values()) {
      for (let i = 0; i < c.steps.length; i++) {
        for (const direction of ['easier', 'harder'] as const) {
          const target = swapTarget(c, i, direction, { barEnabled: true, getExercise: byId })
          if (!target) continue
          const current = byId(c.steps[i].exerciseId)
          expect(current).toBeDefined()
          expect(target.exercise.pattern).toBe(current?.pattern)
        }
      }
    }
  })

  it('never offers a target more than one difficulty band away', () => {
    for (const c of chainById.values()) {
      for (let i = 0; i < c.steps.length; i++) {
        for (const direction of ['easier', 'harder'] as const) {
          const target = swapTarget(c, i, direction, { barEnabled: true, getExercise: byId })
          if (!target) continue
          const current = byId(c.steps[i].exerciseId)
          expect(
            Math.abs(target.exercise.difficulty - (current?.difficulty ?? 0)),
          ).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('returns null for an out-of-range step index', () => {
    const pushup = chain('chain-pushup')
    const target = swapTarget(pushup, pushup.steps.length + 5, 'harder', {
      barEnabled: false,
      getExercise: byId,
    })
    expect(target).toBeNull()
  })

  it('is deterministic: same inputs produce the same target', () => {
    const row = chain('chain-row')
    const ctx = { barEnabled: true, getExercise: byId }
    const a = swapTarget(row, 1, 'harder', ctx)
    const b = swapTarget(row, 1, 'harder', ctx)
    expect(a?.exercise.id).toBe(b?.exercise.id)
    expect(a?.stepIndex).toBe(b?.stepIndex)
  })

  it('every seeded strength exercise sits at its declared (1-based) chain step', () => {
    for (const ex of exercises) {
      if (!ex.chainId || ex.step == null) continue
      const c = chainById.get(ex.chainId)
      expect(c).toBeDefined()
      const step = c?.steps[ex.step - 1]
      expect(step?.exerciseId).toBe(ex.id)
    }
  })
})

function syntheticExercise(
  id: string,
  pattern: Exercise['pattern'],
  difficulty: Exercise['difficulty'],
  barOnly: boolean,
): Exercise {
  return {
    id: branded<never>(id),
    name: id,
    pattern,
    equipment: ['floor'],
    difficulty,
    metric: 'reps',
    chainId: branded<never>('chain-synthetic'),
    step: null,
    cues: [],
    commonMistakes: [],
    targetMuscles: [],
    safetyNotes: [],
    barOnly,
    createdAt: branded<never>('2026-01-01T00:00:00Z'),
  }
}
