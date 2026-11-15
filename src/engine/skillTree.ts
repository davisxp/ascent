/**
 * Skill-tree engine — unlock states for progression chains.
 * Pure deterministic logic: a node is unlocked when every one of its
 * criteria is satisfied by the user's best logged effort on the
 * criterion's exercise. History comes in as plain workouts; exercise
 * metadata is injected via a lookup.
 */

import type { Exercise, Chain, UnlockCriterion, Metric } from '../domain/exercise'
import type { Workout } from '../domain/workout'

export type NodeState = 'locked' | 'unlocked' | 'current'

export type CriterionProgress = {
  criterion: UnlockCriterion
  /** Best logged value for the criterion's metric, or null if never logged. */
  best: number | null
  met: boolean
}

export type SkillNodeState = {
  /** 1-based step number as declared in the chain. */
  step: number
  /** 0-based index into chain.steps. */
  stepIndex: number
  exercise: Exercise | undefined
  state: NodeState
  criteria: CriterionProgress[]
}
export type SkillTree = {
  chainId: string
  chainName: string
  nodes: SkillNodeState[]
  unlockedCount: number
}

function metricValue(
  set: { reps?: number; holdSeconds?: number; level?: number },
  metric: Metric,
): number | undefined {
  if (metric === 'reps') return set.reps
  if (metric === 'hold-seconds') return set.holdSeconds
  return set.level
}

/** Best logged value of `metric` for one exercise across all workouts. */
export function bestForMetric(
  workouts: Workout[],
  exerciseId: string,
  metric: Metric,
): number | null {
  let best: number | null = null
  for (const w of workouts) {
    for (const ex of w.exercises) {
      if (ex.exerciseId !== exerciseId) continue
      for (const set of ex.sets) {
        if (!set.completed) continue
        const value = metricValue(set, metric)
        if (value != null && (best === null || value > best)) best = value
      }
    }
  }
  return best
}

/**
 * Build the unlock state for one chain.
 *
 * State rules:
 * - `locked`   — at least one criterion unmet.
 * - `current`  — criteria met and it is the last met node in the chain
 *                (the frontier the user should train now).
 * - `unlocked` — criteria met and a later node is also met.
 * Nodes with no criteria (entry steps) count as met.
 */
export function buildSkillTree(
  chain: Chain,
  workouts: Workout[],
  getExercise: (exerciseId: string) => Exercise | undefined,
): SkillTree {
  const nodes: Array<SkillNodeState & { criteriaMet: boolean }> = chain.steps.map(
    (chainStep, stepIndex) => {
      const criteria: CriterionProgress[] = chainStep.unlockCriteria.map((criterion) => {
        const best = bestForMetric(workouts, criterion.exerciseId, criterion.metric)
        return { criterion, best, met: best !== null && best >= criterion.value }
      })
      return {
        step: chainStep.step,
        stepIndex,
        exercise: getExercise(chainStep.exerciseId),
        state: 'locked' as NodeState,
        criteria,
        criteriaMet: criteria.every((c) => c.met),
      }
    },
  )

  let lastMet = -1
  nodes.forEach((n, i) => {
    if (n.criteriaMet) lastMet = i
  })
  nodes.forEach((n, i) => {
    n.state = !n.criteriaMet ? 'locked' : i === lastMet ? 'current' : 'unlocked'
  })

  return {
    chainId: chain.id,
    chainName: chain.name,
    nodes,
    unlockedCount: nodes.filter((n) => n.criteriaMet).length,
  }
}
