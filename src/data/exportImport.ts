/**
 * Export / import — lossless round-trip backup.
 * Export: full JSON (photos base64) with size warning.
 * Import: zod validate → backup-before-replace → atomic rollback on failure.
 * All persistence via repositories (no component touches Dexie).
 */

import { z } from 'zod'
import { db } from '../data/schema'
import { exportEnvelopeSchema } from '../contracts/schema'
import {
  WorkoutRepositoryImpl,
  BodyRepositoryImpl,
  FoodRepositoryImpl,
  FoodLogRepositoryImpl,
  SettingsRepositoryImpl,
  GamificationRepositoryImpl,
  PhotoRepositoryImpl,
} from './repositories'
import { branded, type WorkoutId, type DateISO, type BodyEntryId, type MeasurementId, type ExerciseId, type Kilograms, type Centimeters } from '../domain/ids'
import type {
  Workout,
  WeightEntry,
  MeasurementEntry,
  Photo,
  Food,
  FoodLogEntry,
  UserSettings,
  BodyProfile,
} from '../domain/index'

type Env = z.infer<typeof exportEnvelopeSchema>

export const EXPORT_VERSION = 1
export const PHOTO_SIZE_WARN_MB = 25

export function estimateEnvelopeSizeMB(env: unknown): number {
  return new Blob([JSON.stringify(env)]).size / (1024 * 1024)
}

export async function exportBackup(): Promise<{
  json: string
  sizeMB: number
  oversized: boolean
}> {
  const [profile, settings, workouts, weights, measurements, photos, foods, foodLogs, badges] =
    await Promise.all([
      new BodyRepositoryImpl().getProfile(),
      new SettingsRepositoryImpl().get(),
      new WorkoutRepositoryImpl().getAll(),
      new BodyRepositoryImpl().getWeightEntries(),
      new BodyRepositoryImpl().getMeasurementEntries(),
      new BodyRepositoryImpl().getPhotos(),
      new FoodRepositoryImpl().getAll(),
      new FoodLogRepositoryImpl().getRange('1970-01-01', '2100-12-31'),
      new GamificationRepositoryImpl().getBadges(),
    ])

  const env: Env = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    bodyProfile: (profile ?? emptyProfile()) as unknown as Env['bodyProfile'],
    settings,
    workouts: workouts as unknown as Env['workouts'],
    weightEntries: weights as unknown as Env['weightEntries'],
    measurementEntries: measurements as unknown as Env['measurementEntries'],
    photos: photos as unknown as Env['photos'],
    foods: foods as unknown as Env['foods'],
    foodLogEntries: foodLogs as unknown as Env['foodLogEntries'],
    badges: badges as unknown as Env['badges'],
  }

  const sizeMB = estimateEnvelopeSizeMB(env)
  const json = JSON.stringify(env, null, 2)
  return { json, sizeMB, oversized: sizeMB > PHOTO_SIZE_WARN_MB }
}

function emptyProfile(): BodyProfile {
  return {
    userId: 'user',
    age: null as unknown as number | undefined,
    heightCm: null as unknown as number | undefined,
    sex: null as unknown as string | undefined,
    units: 'metric',
    goal: 'balanced',
    experience: 'beginner',
    daysPerWeek: 3,
    sessionLength: 45,
    barEnabled: false,
    assessmentCompleted: false,
    createdAt: new Date().toISOString() as unknown as string,
    updatedAt: new Date().toISOString() as unknown as string,
  } as unknown as BodyProfile
}

export async function resetAllData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
}

export async function importBackup(json: string): Promise<{ ok: boolean; error?: string }> {
  let env: Env
  try {
    env = exportEnvelopeSchema.parse(JSON.parse(json))
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? `Invalid backup: ${err.message}` : 'Invalid backup.',
    }
  }

  const backup = await exportBackup()

  try {
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map((t) => t.clear()))

      const bodyRepo = new BodyRepositoryImpl()
      const settingsRepo = new SettingsRepositoryImpl()
      const workoutRepo = new WorkoutRepositoryImpl()
      const foodRepo = new FoodRepositoryImpl()
      const foodLogRepo = new FoodLogRepositoryImpl()
      const gamRepo = new GamificationRepositoryImpl()
      const photoRepo = new PhotoRepositoryImpl()

      if (env.bodyProfile) await bodyRepo.saveProfile(toProfile(env.bodyProfile))
      await settingsRepo.save(toSettings(env.settings))
      for (const w of env.workouts) await workoutRepo.save(toWorkout(w))
      for (const e of env.weightEntries) await bodyRepo.saveWeightEntry(toWeightEntry(e))
      for (const e of env.measurementEntries)
        await bodyRepo.saveMeasurementEntry(toMeasurementEntry(e))
      for (const p of env.photos) await photoRepo.save(toPhoto(p))
      for (const f of env.foods) await foodRepo.save(toFood(f))
      for (const fl of env.foodLogEntries) await foodLogRepo.save(toFoodLogEntry(fl))
      for (const b of env.badges) await gamRepo.award(b.id)
    })
  } catch (err) {
    try {
      await rollbackFrom(backup.json)
    } catch {}
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Import failed and rolled back.',
    }
  }
  return { ok: true }
}

async function rollbackFrom(json: string): Promise<void> {
  const env = exportEnvelopeSchema.parse(JSON.parse(json))
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
    const bodyRepo = new BodyRepositoryImpl()
    const settingsRepo = new SettingsRepositoryImpl()
    const workoutRepo = new WorkoutRepositoryImpl()
    const foodRepo = new FoodRepositoryImpl()
    const foodLogRepo = new FoodLogRepositoryImpl()
    const gamRepo = new GamificationRepositoryImpl()
    const photoRepo = new PhotoRepositoryImpl()
    if (env.bodyProfile) await bodyRepo.saveProfile(toProfile(env.bodyProfile))
    await settingsRepo.save(toSettings(env.settings))
    for (const w of env.workouts) await workoutRepo.save(toWorkout(w))
    for (const e of env.weightEntries) await bodyRepo.saveWeightEntry(toWeightEntry(e))
    for (const e of env.measurementEntries)
      await bodyRepo.saveMeasurementEntry(toMeasurementEntry(e))
    for (const p of env.photos) await photoRepo.save(toPhoto(p))
    for (const f of env.foods) await foodRepo.save(toFood(f))
    for (const fl of env.foodLogEntries) await foodLogRepo.save(toFoodLogEntry(fl))
    for (const b of env.badges) await gamRepo.award(b.id)
  })
}

function toProfile(p: unknown): BodyProfile {
  return p as unknown as BodyProfile
}
function toSettings(s: unknown): UserSettings {
  return s as unknown as UserSettings
}
function toWorkout(w: Env['workouts'][number]): Workout {
  return {
    id: branded<WorkoutId>(w.id),
    date: branded<DateISO>(w.date),
    dayIndex: w.dayIndex,
    weekIndex: w.weekIndex,
    mesocycleIndex: w.mesocycleIndex,
    isDeload: w.isDeload,
    split: w.split,
    exercises: w.exercises as unknown as Workout['exercises'],
    durationSeconds: w.durationSeconds,
    completedAt: w.completedAt ? branded<DateISO>(w.completedAt) : undefined,
    xpAwarded: w.xpAwarded,
    prs: w.prs.map((id) => branded<ExerciseId>(id)),
    why: w.why,
  }
}
function toWeightEntry(e: Env['weightEntries'][number]): WeightEntry {
  return {
    id: branded<BodyEntryId>(e.id),
    date: branded<DateISO>(e.date),
    weightKg: branded<Kilograms>(e.weightKg),
    source: e.source,
  }
}
function toMeasurementEntry(e: Env['measurementEntries'][number]): MeasurementEntry {
  return {
    id: branded<MeasurementId>(e.id),
    date: branded<DateISO>(e.date),
    site: e.site,
    valueCm: branded<Centimeters>(e.valueCm),
  }
}
function toPhoto(p: Env['photos'][number]): Photo {
  return {
    id: branded(p.id),
    date: branded(p.date),
    view: p.view,
    blob: p.blob,
    thumbnail: p.thumbnail,
    width: p.width,
    height: p.height,
  }
}
function toFood(f: Env['foods'][number]): Food {
  return f as unknown as Food
}
function toFoodLogEntry(e: Env['foodLogEntries'][number]): FoodLogEntry {
  return {
    id: branded(e.id),
    foodId: branded(e.foodId),
    foodName: e.foodName,
    grams: e.grams,
    kcal: e.kcal,
    proteinG: e.proteinG,
    fatG: e.fatG,
    carbsG: e.carbsG,
    meal: e.meal,
    date: branded(e.date),
  }
}
