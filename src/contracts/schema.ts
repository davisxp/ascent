/**
 * Zod validation schemas for all domain types.
 * Used for import validation and runtime boundary checks.
 * Domain types are inferred from these schemas via z.infer.
 */

import { z } from 'zod'

export const exerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  pattern: z.string(),
  equipment: z.array(z.string()),
  difficulty: z.number().int().min(1).max(10),
  metric: z.union([z.literal('reps'), z.literal('hold-seconds'), z.literal('level')]),
  chainId: z.union([z.string(), z.null()]),
  step: z.union([z.number().int(), z.null()]),
  cues: z.array(z.string()).min(3),
  commonMistakes: z.array(z.string()).min(3),
  targetMuscles: z.array(z.string()),
  safetyNotes: z.array(z.string()),
  barOnly: z.boolean(),
  createdAt: z.string().datetime(),
})

export type ExerciseInput = z.infer<typeof exerciseSchema>

export const workoutSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  dayIndex: z.number().int().min(0).max(6),
  weekIndex: z.number().int().min(0).max(3),
  mesocycleIndex: z.number().int().min(0),
  isDeload: z.boolean(),
  split: z.union([
    z.literal('full-body'),
    z.literal('upper'),
    z.literal('lower'),
    z.literal('push'),
    z.literal('pull'),
    z.literal('legs'),
    z.literal('mobility'),
  ]),
  exercises: z.array(
    z.object({
      exerciseId: z.string().min(1),
      name: z.string().min(1),
      metric: z.union([z.literal('reps'), z.literal('hold-seconds'), z.literal('level')]),
      sets: z.array(
        z.object({
          id: z.string().min(1),
          exerciseId: z.string().min(1),
          reps: z.union([z.number().int().nonnegative(), z.null()]),
          holdSeconds: z.union([z.number().nonnegative(), z.null()]),
          level: z.union([z.number().int().nonnegative(), z.null()]),
          rpe: z.number().min(1).max(10),
          completed: z.boolean(),
          note: z.union([z.string(), z.null()]),
          order: z.number().int().nonnegative(),
        }),
      ),
    }),
  ),
  durationSeconds: z.number().int().nonnegative(),
  completedAt: z.union([z.string(), z.null()]),
  xpAwarded: z.number().int().nonnegative(),
  prs: z.array(z.string().min(1)),
  why: z.string().min(1),
})

export type WorkoutInput = z.infer<typeof workoutSchema>

export const weightEntrySchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  weightKg: z.number().positive(),
  source: z.union([z.literal('manual'), z.literal('scale')]),
})

export type WeightEntryInput = z.infer<typeof weightEntrySchema>

export const measurementEntrySchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  site: z.union([
    z.literal('shoulders'),
    z.literal('chest'),
    z.literal('waist'),
    z.literal('hips'),
    z.literal('arm'),
    z.literal('thigh'),
    z.literal('calf'),
  ]),
  valueCm: z.number().positive(),
})

export type MeasurementEntryInput = z.infer<typeof measurementEntrySchema>

export const photoSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  view: z.union([z.literal('front'), z.literal('side'), z.literal('back')]),
  blob: z.string(),
  thumbnail: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})

export type PhotoInput = z.infer<typeof photoSchema>

export const foodSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  brand: z.union([z.string(), z.null()]),
  kcalPer100g: z.number().nonnegative(),
  proteinGPer100g: z.number().nonnegative(),
  fatGPer100g: z.number().nonnegative(),
  carbsGPer100g: z.number().nonnegative(),
  category: z.string(),
  householdMeasure: z.union([
    z.object({ name: z.string(), grams: z.number().positive() }),
    z.null(),
  ]),
  custom: z.boolean(),
  createdAt: z.string().datetime(),
})

export type FoodInput = z.infer<typeof foodSchema>

export const foodLogEntrySchema = z.object({
  id: z.string().min(1),
  foodId: z.string().min(1),
  foodName: z.string().min(1),
  grams: z.number().positive(),
  kcal: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  meal: z.union([z.literal('breakfast'), z.literal('lunch'), z.literal('dinner'), z.literal('snack')]),
  date: z.string().min(1),
})

export type FoodLogEntryInput = z.infer<typeof foodLogEntrySchema>

export const settingsSchema = z.object({
  theme: z.union([z.literal('light'), z.literal('dark'), z.literal('system')]),
  sound: z.union([z.literal('on'), z.literal('muted')]),
  defaultRestSeconds: z.number().int().nonnegative(),
  units: z.union([z.literal('metric'), z.literal('imperial')]),
  wakeLock: z.boolean(),
  reducedMotion: z.boolean(),
})

export type SettingsInput = z.infer<typeof settingsSchema>

export const bodyProfileSchema = z.object({
  userId: z.string().min(1),
  age: z.union([z.number().int().positive(), z.null()]),
  heightCm: z.union([z.number().positive(), z.null()]),
  sex: z.union([z.literal('male'), z.literal('female'), z.literal('other'), z.null()]),
  units: z.union([z.literal('metric'), z.literal('imperial')]),
  goal: z.union([z.literal('strength'), z.literal('skills'), z.literal('flexibility'), z.literal('balanced')]),
  experience: z.union([z.literal('beginner'), z.literal('intermediate'), z.literal('advanced')]),
  daysPerWeek: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
  sessionLength: z.union([z.literal(20), z.literal(30), z.literal(45), z.literal(60)]),
  barEnabled: z.boolean(),
  assessmentCompleted: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type BodyProfileInput = z.infer<typeof bodyProfileSchema>

export const badgeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  icon: z.string(),
  category: z.union([
    z.literal('workout'),
    z.literal('pr'),
    z.literal('flexibility'),
    z.literal('skill'),
    z.literal('streak'),
    z.literal('body'),
    z.literal('fuel'),
  ]),
  xpReward: z.number().int().nonnegative(),
})

export type BadgeInput = z.infer<typeof badgeSchema>

/**
 * Full export envelope. Import validates against this then applies store-by-store.
 */
export const exportEnvelopeSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  bodyProfile: bodyProfileSchema,
  settings: settingsSchema,
  workouts: z.array(workoutSchema),
  weightEntries: z.array(weightEntrySchema),
  measurementEntries: z.array(measurementEntrySchema),
  photos: z.array(photoSchema),
  foods: z.array(foodSchema),
  foodLogEntries: z.array(foodLogEntrySchema),
  badges: z.array(badgeSchema),
})
