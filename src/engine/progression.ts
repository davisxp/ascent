/**
 * Progression engine — double progression, deload, miss/repeat/regress.
 * Pure deterministic logic.
 */

import type { Placement } from '../domain/workout'
import type { RPE } from '../domain/ids'

export type ProgressionAction = 'advance' | 'repeat' | 'regress'

export type ProgressionResult = {
  action: ProgressionAction
  stepIndex: number
  reason: string
}

export type SetPerformance = {
  reps?: number
  holdSeconds?: number
  rpe: RPE
  completed: boolean
}

export type ProgressionInputs = {
  placement: Placement
  repsRange?: [number, number] // for rep-based exercises
  holdTargetSeconds?: number // for hold-based exercises
  recentSets: SetPerformance[] // most recent workout's sets for the current exercise
  consecutiveMisses: number // prior consecutive misses at this step
}

/**
 * Evaluate whether to advance, repeat, or regress a chain step.
 *
 * Rules:
 * - Rep-based: top of rep range on ALL sets at RPE ≤ 8 → advance.
 * - Hold-based: reach holdTargetSeconds on all sets → advance.
 * - Miss (fail to complete target): miss twice → repeat; three times → regress.
 * - Otherwise repeat.
 */
export function evaluateProgression(inputs: ProgressionInputs): ProgressionResult {
  const { placement, repsRange, holdTargetSeconds, recentSets, consecutiveMisses } = inputs

  const allCompleted = recentSets.length > 0 && recentSets.every((s) => s.completed)

  let hitTarget = false
  if (repsRange && allCompleted) {
    const [, max] = repsRange
    hitTarget = recentSets.every((s) => {
      const reps = s.reps ?? 0
      return reps >= max && s.rpe <= 8
    })
  } else if (holdTargetSeconds && allCompleted) {
    hitTarget = recentSets.every((s) => (s.holdSeconds ?? 0) >= holdTargetSeconds)
  }

  if (hitTarget) {
    return {
      action: 'advance',
      stepIndex: placement.stepIndex + 1,
      reason: 'Hit target on all sets at acceptable RPE — advance to next step.',
    }
  }

  // Determine if this was a miss (failed to hit target)
  const missed = !hitTarget && allCompleted && recentSets.length > 0

  const newMissCount = missed ? consecutiveMisses + 1 : consecutiveMisses

  if (newMissCount >= 3 && placement.stepIndex > 0) {
    return {
      action: 'regress',
      stepIndex: placement.stepIndex - 1,
      reason: 'Missed target three times — regress to prior step.',
    }
  }
  if (newMissCount >= 2) {
    return {
      action: 'repeat',
      stepIndex: placement.stepIndex,
      reason: 'Missed target twice — repeat this step.',
    }
  }

  return {
    action: 'repeat',
    stepIndex: placement.stepIndex,
    reason: 'Target not yet met — repeat this step.',
  }
}

/**
 * Deload volume: reduce target sets/reps to 60% during deload week.
 */
export function deloadVolume(targetSets: number, targetReps?: [number, number]): {
  sets: number
  reps?: [number, number]
} {
  const sets = Math.max(1, Math.round(targetSets * 0.6))
  let reps: [number, number] | undefined
  if (targetReps) {
    reps = [
      Math.max(1, Math.round(targetReps[0] * 0.6)),
      Math.max(1, Math.round(targetReps[1] * 0.6)),
    ]
  }
  return { sets, reps }
}

/**
 * Hold progression ladder: 20s → 40s then advance.
 */
export function holdLadder(currentSeconds: number): { target: number; advanced: boolean } {
  if (currentSeconds < 20) return { target: 20, advanced: false }
  if (currentSeconds < 40) return { target: 40, advanced: false }
  return { target: 40, advanced: true }
}
