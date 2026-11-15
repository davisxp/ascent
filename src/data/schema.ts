/**
 * Dexie schema v1.
 * Versioned store definitions. Migrations live in src/data/migrations/.
 */

import Dexie, { type Table } from 'dexie'
import type { FinancePlan } from '../domain/finance'
import type { InvestmentPlan } from '../domain/investment'

export const DB_NAME = 'ascent'
export const DB_VERSION = 2

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
  tasks: Table<TaskRow, string>
  financePlan: Table<FinancePlanRow, string>
  investmentPlan: Table<InvestmentPlanRow, string>
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

export interface NetworkRow {
  id: string
  name: string
  relation: string | null
  notes: string | null
}

export interface MedicalRow {
  id: string
  title: string
  body: string
  date: string
}

export interface EstateRow {
  id: string
  name: string
  value: number
  notes: string | null
}

export interface CareerRow {
  id: string
  title: string
  status: string
  notes: string | null
}

export interface GroomingRow {
  id: string
  title: string
  period: string
  steps: string[]
}

export interface WardrobeRow {
  id: string
  name: string
  category: string
  status: string
  size: string | null
  notes: string | null
}

export interface InvestmentRow {
  id: string
  name: string
  value: number
  kind: string
  updatedAt: string
}

export interface FinanceRow {
  id: string
  name: string
  amount: number
  kind: string
  date: string
  notes: string | null
}

export interface FinancePlanRow {
  id: string
  plan: FinancePlan
}

export interface InvestmentPlanRow {
  id: string
  plan: InvestmentPlan
}

export interface TaskRow {
  id: string
  title: string
  status: string
  due: string | null
  notes: string | null
  createdAt: string
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
  tasks!: Table<TaskRow, string>
  finances!: Table<FinanceRow, string>
  investments!: Table<InvestmentRow, string>
  wardrobe!: Table<WardrobeRow, string>
  grooming!: Table<GroomingRow, string>
  network!: Table<NetworkRow, string>
  career!: Table<CareerRow, string>
  medical!: Table<MedicalRow, string>
  estate!: Table<EstateRow, string>
  financePlan!: Table<FinancePlanRow, string>
  investmentPlan!: Table<InvestmentPlanRow, string>

  constructor() {
    super(DB_NAME)
    this.version(1).stores({
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
       tasks: 'id, status',
       finances: 'id, kind',
       investments: 'id, kind',
       wardrobe: 'id, category',
       grooming: 'id, period',
       network: 'id',
       career: 'id, status',
       medical: 'id',
       estate: 'id',
     })
    // v2: singleton plan documents for the Finances and Investments tabs.
    this.version(DB_VERSION).stores({
      financePlan: 'id',
      investmentPlan: 'id',
    })
  }
}

export const db = new AscentDatabase()

