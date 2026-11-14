/**
 * Exercise domain types.
 */

import type { ExerciseId, ChainId, DateISO, RPE, SetId } from './ids'

export type Metric = 'reps' | 'hold-seconds' | 'level'

export type Equipment =
  | 'floor'
  | 'wall'
  | 'chair'
  | 'table'
  | 'bed'
  | 'couch'
  | 'door-frame'
  | 'towel'
  | 'bar'
  | 'rings'

export type Pattern =
  | 'push'
  | 'pull'
  | 'squat'
  | 'hinge'
  | 'core'
  | 'l-sit'
  | 'handstand'
  | 'planche'
  | 'front-lever'
  | 'bridge'
  | 'mobility'
  | 'flexibility'

export type Difficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export type UnlockCriterion = {
  exerciseId: ExerciseId
  metric: Metric
  value: number
  note?: string
}

export type Exercise = {
  id: ExerciseId
  name: string
  pattern: Pattern
  equipment: Equipment[]
  difficulty: Difficulty
  metric: Metric
  chainId: ChainId | null
  step: number | null
  cues: string[] // 3-5
  commonMistakes: string[] // 3
  targetMuscles: string[]
  safetyNotes: string[]
  barOnly: boolean // excluded from plans unless bar enabled
  createdAt: DateISO
}

export type ChainStep = {
  step: number
  exerciseId: ExerciseId
  unlockCriteria: UnlockCriterion[] // must be satisfiable by prior steps
}

export type Chain = {
  id: ChainId
  name: string
  pattern: Pattern
  steps: ChainStep[] // contiguous 1..n
}

export type ChainPlacement = {
  chainId: ChainId
  stepIndex: number // 0-based into steps
}

export type SetOutcome = {
  setId: SetId
  reps?: number
  holdSeconds?: number
  level?: number
  rpe: RPE
  completed: boolean
  note?: string
}
