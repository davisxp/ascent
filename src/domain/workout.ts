/**
 * Workout / program domain types.
 */

import type {
  WorkoutId,
  SetId,
  ExerciseId,
  DateISO,
  RPE,
} from './ids'

export type SetLog = {
  id: SetId
  exerciseId: ExerciseId
  reps?: number
  holdSeconds?: number
  level?: number
  rpe: RPE
  completed: boolean
  note?: string
  order: number
}

export type ExerciseLog = {
  exerciseId: ExerciseId
  name: string
  metric: 'reps' | 'hold-seconds' | 'level'
  sets: SetLog[]
}

export type Workout = {
  id: WorkoutId
  date: DateISO
  dayIndex: number // 0-6 within week
  weekIndex: number // 0-3 within mesocycle
  mesocycleIndex: number
  isDeload: boolean
  split: 'full-body' | 'upper' | 'lower' | 'push' | 'pull' | 'legs' | 'mobility'
  exercises: ExerciseLog[]
  durationSeconds: number
  completedAt?: DateISO
  xpAwarded: number
  prs: ExerciseId[] // exercises that set a PR this workout
  why: string // rule-generated plain-language rationale
}

export type DayPlan = {
  date: DateISO
  split: Workout['split']
  exercises: Array<{
    exerciseId: ExerciseId
    name: string
    metric: 'reps' | 'hold-seconds' | 'level'
    targetSets: number
    targetReps?: [number, number] // rep range
    targetHoldSeconds?: number
    restSeconds: number
    rpeCap: RPE
  }>
}

export type Mesocycle = {
  index: number
  weeks: WeekPlan[]
  deloadWeekIndex: number // always 3
}

export type WeekPlan = {
  index: number // 0-3
  days: DayPlan[]
}

export type Placement = {
  chainId: string
  stepIndex: number
}
