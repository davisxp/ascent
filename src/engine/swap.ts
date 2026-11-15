/**
 * Swap engine — resolve manual exercise swaps along a chain.
 * Pure deterministic logic; exercise metadata is injected via a lookup,
 * never imported from content here.
 */

import type { Exercise, Chain } from '../domain/exercise'

export type SwapDirection = 'easier' | 'harder'

export type SwapContext = {
  barEnabled: boolean
  getExercise: (exerciseId: string) => Exercise | undefined
}

export type SwapCandidate = {
  stepIndex: number
  exercise: Exercise
}

/**
 * Resolve the target step for a manual swap along a chain.
 *
 * Rules:
 * - Targets are scanned one step at a time in the chosen direction.
 * - A target must share the current exercise's movement pattern.
 * - A target's difficulty must stay within ±1 of the current difficulty.
 * - Bar-only targets are skipped unless the bar is enabled.
 * - Scanning stops at the end of the chain.
 *
 * Returns null when no valid target exists (chain end or no compliant step).
 */
export function swapTarget(
  chain: Chain,
  currentStepIndex: number,
  direction: SwapDirection,
  ctx: SwapContext,
): SwapCandidate | null {
  const currentStep = chain.steps[currentStepIndex]
  const current = currentStep ? ctx.getExercise(currentStep.exerciseId) : undefined
  if (!current) return null

  const delta = direction === 'easier' ? -1 : 1
  for (
    let stepIndex = currentStepIndex + delta;
    stepIndex >= 0 && stepIndex < chain.steps.length;
    stepIndex += delta
  ) {
    const step = chain.steps[stepIndex]
    const candidate = ctx.getExercise(step.exerciseId)
    if (
      candidate &&
      candidate.pattern === current.pattern &&
      Math.abs(candidate.difficulty - current.difficulty) <= 1 &&
      (!candidate.barOnly || ctx.barEnabled)
    ) {
      return { stepIndex, exercise: candidate }
    }
  }
  return null
}
