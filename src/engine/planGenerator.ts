/**
 * Plan generator — 4-week mesocycle, splits, session shape, 'why this workout'.
 * Pure deterministic logic.
 */

import type { DayPlan, Mesocycle, WeekPlan } from '../domain/workout'
import type { ExerciseId, RPE, ChainId, DateISO } from '../domain/ids'
import { branded } from '../domain/ids'
import { chainById } from '../content/index'
import { deloadVolume } from './progression'

export type PlanInputs = {
  placements: Map<string, number> // chainId -> stepIndex
  daysPerWeek: 2 | 3 | 4 | 5 | 6
  sessionLength: 20 | 30 | 45 | 60
  goal: 'strength' | 'skills' | 'flexibility' | 'balanced'
  barEnabled: boolean
  weekIndex: number // 0-3
}

const isDeloadWeek = (weekIndex: number) => weekIndex === 3

const splitForDays = (days: number): 'full-body' | 'upper-lower' | 'ppl' => {
  if (days <= 3) return 'full-body'
  if (days === 4) return 'upper-lower'
  return 'ppl'
}

const setsForLength = (sessionLength: number): number => {
  switch (sessionLength) {
    case 20: return 2
    case 30: return 3
    case 45: return 3
    default: return 4
  }
}

const repsForDifficulty = (difficulty: number): [number, number] => {
  if (difficulty <= 3) return [12, 20]
  if (difficulty <= 5) return [8, 15]
  if (difficulty <= 7) return [6, 12]
  return [4, 8]
}

const holdForDifficulty = (difficulty: number): number => {
  if (difficulty <= 3) return 20
  if (difficulty <= 5) return 30
  if (difficulty <= 7) return 40
  return 20
}

/** Pick one representative exercise from a chain at the given step. */
function exerciseForChain(chainId: ChainId, stepIndex: number): ExerciseId | null {
  const chain = chainById.get(chainId)
  if (!chain) return null
  const step = chain.steps[Math.min(stepIndex, chain.steps.length - 1)]
  return step ? step.exerciseId : null
}

/**
 * Generate a week of day plans.
 */
export function generateWeek(inputs: PlanInputs): WeekPlan {
  const { placements, daysPerWeek, sessionLength, barEnabled, weekIndex } = inputs
  const deload = isDeloadWeek(weekIndex)
  const splitMode = splitForDays(daysPerWeek)
  const baseSets = setsForLength(sessionLength)

  const days: DayPlan[] = []

  // Build daily templates
  for (let dayIndex = 0; dayIndex < daysPerWeek; dayIndex++) {
    let split: DayPlan['split']
    let chainIds: string[]

    if (splitMode === 'full-body') {
      split = 'full-body'
      chainIds = ['chain-pushup', 'chain-row', 'chain-squat', 'chain-hip', 'chain-core']
    } else if (splitMode === 'upper-lower') {
      const isUpper = dayIndex % 2 === 0
      split = isUpper ? 'upper' : 'lower'
      chainIds = isUpper ? ['chain-pushup', 'chain-row', 'chain-core'] : ['chain-squat', 'chain-hip', 'chain-core']
    } else {
      // ppl: day 0 push, 1 pull, 2 legs, 3 push, 4 pull, 5 legs(+mobility)
      const mod = dayIndex % 6
      if (mod === 0 || mod === 3) { split = 'push'; chainIds = ['chain-pushup', 'chain-handstand'] }
      else if (mod === 1 || mod === 4) { split = 'pull'; chainIds = ['chain-row', 'chain-front-lever', 'chain-planche'] }
      else { split = 'legs'; chainIds = ['chain-squat', 'chain-hip', 'chain-core'] }
    }

    // Add dedicated mobility session on the last day for 5-6 day splits
    if (daysPerWeek >= 5 && dayIndex === daysPerWeek - 1) {
      split = 'mobility'
      chainIds = ['chain-forward-fold', 'chain-deep-squat', 'chain-couch-stretch', 'chain-wrist-routine', 'chain-thoracic-rotation']
    }

    const exercises = chainIds
      .map((cid) => {
        if (!barEnabled && cid === 'chain-bar') return null
        const stepIndex = placements.get(cid) ?? 0
        const exerciseId = exerciseForChain(branded<ChainId>(cid), stepIndex)
        if (!exerciseId) return null
        const sets = deload ? deloadVolume(baseSets).sets : baseSets
        const [repMin, repMax] = repsForDifficulty(placements.get(cid) ?? 1)
        const reps: [number, number] | undefined = deload
          ? deloadVolume(baseSets, [repMin, repMax]).reps
          : [repMin, repMax]
        const holdSeconds = holdForDifficulty(placements.get(cid) ?? 1)
        return {
          exerciseId,
          name: '', // filled by UI from content
          metric: 'reps' as const,
          targetSets: sets,
          targetReps: reps,
          targetHoldSeconds: holdSeconds,
          restSeconds: deload ? 60 : 90,
          rpeCap: branded<RPE>(8),
        }
      })
      .filter((e): e is NonNullable<typeof e> => e !== null)

    const date = new Date(Date.now() + dayIndex * 86400000).toISOString().slice(0, 10)
    days.push({
      date: branded<DateISO>(date),
      split,
      exercises,
    })
  }

  return { index: weekIndex, days }
}

/**
 * Generate a full 4-week mesocycle.
 */
export function generateMesocycle(
  baseInputs: Omit<PlanInputs, 'weekIndex'>,
): Mesocycle {
  const weeks: WeekPlan[] = []
  for (let w = 0; w < 4; w++) {
    weeks.push(generateWeek({ ...baseInputs, weekIndex: w }))
  }
  return { index: 0, weeks, deloadWeekIndex: 3 }
}

/**
 * Rule-generated plain-language 'why this workout' rationale.
 */
export function whyWorkout(day: DayPlan, ctx: {
  goal: string
  deload: boolean
}): string {
  const { deload } = ctx

  if (day.split === 'mobility') {
    return 'Dedicated mobility session — keep tissues supple and joints healthy.'
  }
  if (deload) {
    return 'Deload week at 60% volume — recovery lets last week’s work stick.'
  }
  if (day.split === 'full-body') {
    return 'Full-body day: hit push, pull, squat, hinge and core in one session.'
  }
  if (day.split === 'upper') {
    return 'Upper day — push and pull plus core; vertical and horizontal balance.'
  }
  if (day.split === 'lower') {
    return 'Lower day — squat, hinge and core for leg and hip strength.'
  }
  if (day.split === 'push') {
    return 'Push day — pressing and handstand skill while you’re fresh.'
  }
  if (day.split === 'pull') {
    return 'Pull day — rows and lever/planche skill work.'
  }
  if (day.split === 'legs') {
    return 'Legs day — squat, hinge and core.'
  }
  return 'A balanced session built around your current chain placements.'
}
