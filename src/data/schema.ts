/**
 * Dexie schema v1.
 * Versioned store definitions. Migrations live in src/data/migrations/.
 */

import Dexie, { type Table } from 'dexie'

export const DB_NAME = 'ascent'
export const DB_VERSION = 1

export interface AscentDB extends Dexie {
  exercises: Table<ExerciseRow, string>
  workouts: Table<WorkoutRow, string>
  dayPlans: Table<DayPlanRow, string>
  weightEntries: Table<WeightEntryRow, string>
  measurementEntries: Table<MeasurementEntryRow, string>
  photos: Table<PhotoRow, string>
  bodyProfile: Table<BodyProfileRow, string>
  foods: Table<FoodRow, string>
  foodLogEntries: Table<FoodLogEntryRow, string>
  settings: Table<SettingsRow, string>
  badges: Table<BadgeRow, string>
  badgeAwards: Table<BadgeAwardRow, string>
  gamification: Table<GamificationRow, string>
}

export interface ExerciseRow {
  id: string
  name: string
  pattern: string
  equipment: string[]
  difficulty: number
  metric: string
  chainId: string | null
  step: number | null
  cues: string[]
  commonMistakes: string[]
  targetMuscles: string[]
  safetyNotes: string[]
  barOnly: boolean
  createdAt: string
}

export interface WorkoutRow {
  id: string
  date: string
  dayIndex: number
  weekIndex: number
  mesocycleIndex: number
  isDeload: boolean
  split: string
  exercises: unknown[]
  durationSeconds: number
  completedAt: string | null
  xpAwarded: number
  prs: string[]
  why: string
}

export interface DayPlanRow {
  id: string
  weekStart: string
  date: string
  split: string
  exercises: unknown[]
}

export interface WeightEntryRow {
  id: string
  date: string
  weightKg: number
  source: string
}

export interface MeasurementEntryRow {
  id: string
  date: string
  site: string
  valueCm: number
}

export interface PhotoRow {
  id: string
  date: string
  view: string
  blob: string // base64
  thumbnail: string // base64
  width: number
  height: number
}

export interface BodyProfileRow {
  userId: string
  age: number | null
  heightCm: number | null
  sex: string | null
  units: string
  goal: string
  experience: string
  daysPerWeek: number
  sessionLength: number
  barEnabled: boolean
  assessmentCompleted: boolean
  createdAt: string
  updatedAt: string
}

export interface FoodRow {
  id: string
  name: string
  brand: string | null
  kcalPer100g: number
  proteinGPer100g: number
  fatGPer100g: number
  carbsGPer100g: number
  category: string
  householdMeasure: { name: string; grams: number } | null
  custom: boolean
  createdAt: string
}

export interface FoodLogEntryRow {
  id: string
  foodId: string
  foodName: string
  grams: number
  kcal: number
  proteinG: number
  fatG: number
  carbsG: number
  meal: string
  date: string
}

export interface SettingsRow {
  id: string
  theme: string
  sound: string
  defaultRestSeconds: number
  units: string
  wakeLock: boolean
  reducedMotion: boolean
}

export interface BadgeRow {
  id: string
  name: string
  description: string
  icon: string
  category: string
  xpReward: number
}

export interface BadgeAwardRow {
  badgeId: string
  earnedAt: string
}

export interface GamificationRow {
  id: string
  totalXP: number
  level: number
  streakCurrent: number
  streakBest: number
  lastTrainingDate: string | null
}

export class AscentDatabase extends Dexie implements AscentDB {
  exercises!: Table<ExerciseRow, string>
  workouts!: Table<WorkoutRow, string>
  dayPlans!: Table<DayPlanRow, string>
  weightEntries!: Table<WeightEntryRow, string>
  measurementEntries!: Table<MeasurementEntryRow, string>
  photos!: Table<PhotoRow, string>
  bodyProfile!: Table<BodyProfileRow, string>
  foods!: Table<FoodRow, string>
  foodLogEntries!: Table<FoodLogEntryRow, string>
  settings!: Table<SettingsRow, string>
  badges!: Table<BadgeRow, string>
  badgeAwards!: Table<BadgeAwardRow, string>
  gamification!: Table<GamificationRow, string>

  constructor() {
    super(DB_NAME)
    this.version(DB_VERSION).stores({
      exercises: 'id',
      workouts: 'id, date',
      dayPlans: 'id, weekStart',
      weightEntries: 'id, date',
      measurementEntries: 'id, date',
      photos: 'id, date',
      bodyProfile: 'userId',
      foods: 'id',
      foodLogEntries: 'id, date',
      settings: 'id',
      badges: 'id',
      badgeAwards: 'badgeId',
      gamification: 'id',
    })
  }
}

export const db = new AscentDatabase()
