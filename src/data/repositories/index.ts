/**
 * Repository implementations backed by Dexie.
 * Maps domain types to Dexie rows. All persistence funnels here.
 */

import { db } from '../schema'
import { branded, type ExerciseId, type ChainId, type WorkoutId, type BodyEntryId, type PhotoId, type FoodId, type BadgeId, type MeasurementId } from '../../domain/ids'
import type {
  ExerciseRepository,
  WorkoutRepository,
  DayPlanRepository,
  BodyRepository,
  FoodRepository,
  FoodLogRepository,
  SettingsRepository,
  GamificationRepository,
  PhotoRepository,
} from '../../contracts/repositories'
import type {
  ExerciseRow,
  WorkoutRow,
  DayPlanRow,
  WeightEntryRow,
  MeasurementEntryRow,
  PhotoRow,
  BodyProfileRow,
  FoodRow,
  FoodLogEntryRow,
  SettingsRow,
  BadgeRow,
  BadgeAwardRow,
} from '../schema'
import type {
  Exercise,
  Workout,
  DayPlan,
  WeightEntry,
  MeasurementEntry,
  Photo,
  BodyProfile,
  Food,
  FoodLogEntry,
  DailyTotals,
  Badge,
  BadgeAward,
  LevelInfo,
  RankTitle,
  Streak,
  UserSettings,
  Metric,
  Equipment,
  Difficulty,
  DateISO,
  Pattern,
  Centimeters,
  Kilograms,
} from '../../domain/index'
import { WATER_FOOD_ID } from '../../domain/fuel'

// ---------- helpers ----------

const firstRow = async <T>(rows: T[]): Promise<T | null> => (rows.length ? rows[0] : null)

// ---------- exercise ----------

export class ExerciseRepositoryImpl implements ExerciseRepository {
  async getAll(): Promise<Exercise[]> {
    const rows = await db.exercises.toArray()
    return rows.map(toExercise)
  }
  async getById(id: string): Promise<Exercise | null> {
    const row = await db.exercises.get(id)
    return row ? toExercise(row) : null
  }
  async getByChain(chainId: string): Promise<Exercise[]> {
    const rows = await db.exercises.where('chainId').equals(chainId).toArray()
    return rows.map(toExercise)
  }
  async seed(exercises: Exercise[]): Promise<void> {
    await db.exercises.clear()
    await db.exercises.bulkPut(exercises.map(toExerciseRow))
  }
}

function toExercise(row: ExerciseRow): Exercise {
  return {
    id: branded<ExerciseId>(row.id),
    name: row.name,
    pattern: row.pattern as unknown as Pattern,
    equipment: row.equipment as unknown as Equipment[],
    difficulty: row.difficulty as unknown as Difficulty,
    metric: row.metric as unknown as Metric,
    chainId: row.chainId ? branded<ChainId>(row.chainId) : null,
    step: row.step,
    cues: row.cues,
    commonMistakes: row.commonMistakes,
    targetMuscles: row.targetMuscles,
    safetyNotes: row.safetyNotes,
    barOnly: row.barOnly,
    createdAt: row.createdAt as unknown as DateISO,
  }
}
function toExerciseRow(e: Exercise): ExerciseRow {
  return {
    id: e.id,
    name: e.name,
    pattern: e.pattern,
    equipment: e.equipment,
    difficulty: e.difficulty,
    metric: e.metric,
    chainId: e.chainId,
    step: e.step,
    cues: e.cues,
    commonMistakes: e.commonMistakes,
    targetMuscles: e.targetMuscles,
    safetyNotes: e.safetyNotes,
    barOnly: e.barOnly,
    createdAt: e.createdAt,
  }
}

// ---------- workout ----------

export class WorkoutRepositoryImpl implements WorkoutRepository {
  async getAll(): Promise<Workout[]> {
    const rows = await db.workouts.toArray()
    return rows.map(toWorkout)
  }
  async getById(id: string): Promise<Workout | null> {
    const row = await db.workouts.get(id)
    return row ? toWorkout(row) : null
  }
  async getByDate(date: string): Promise<Workout | null> {
    const row = await db.workouts.where('date').equals(date).first()
    return row ? toWorkout(row) : null
  }
  async save(workout: Workout): Promise<void> {
    await db.workouts.put(toWorkoutRow(workout))
  }
  async delete(id: string): Promise<void> {
    await db.workouts.delete(id)
  }
}

function toWorkout(row: WorkoutRow): Workout {
  return {
    id: branded<WorkoutId>(row.id),
    date: row.date as unknown as DateISO,
    dayIndex: row.dayIndex,
    weekIndex: row.weekIndex,
    mesocycleIndex: row.mesocycleIndex,
    isDeload: row.isDeload,
    split: row.split as unknown as Workout['split'],
    exercises: row.exercises as unknown as Workout['exercises'],
    durationSeconds: row.durationSeconds,
    completedAt: row.completedAt ? branded<DateISO>(row.completedAt) : undefined,
    xpAwarded: row.xpAwarded,
    prs: row.prs.map(branded<ExerciseId>),
    why: row.why,
  }
}
function toWorkoutRow(w: Workout): WorkoutRow {
  return {
    id: w.id,
    date: w.date,
    dayIndex: w.dayIndex,
    weekIndex: w.weekIndex,
    mesocycleIndex: w.mesocycleIndex,
    isDeload: w.isDeload,
    split: w.split,
    exercises: w.exercises,
    durationSeconds: w.durationSeconds,
    completedAt: w.completedAt ?? null,
    xpAwarded: w.xpAwarded,
    prs: w.prs,
    why: w.why,
  }
}

// ---------- day plan ----------

export class DayPlanRepositoryImpl implements DayPlanRepository {
  async getWeek(startDate: string): Promise<DayPlan[]> {
    const rows = await db.dayPlans.where('weekStart').equals(startDate).toArray()
    return rows.map(toDayPlan)
  }
  async saveWeek(startDate: string, plans: DayPlan[]): Promise<void> {
    await db.dayPlans.where('weekStart').equals(startDate).delete()
    await db.dayPlans.bulkPut(plans.map((p) => toDayPlanRow(p, startDate)))
  }
}

function toDayPlan(row: DayPlanRow): DayPlan {
  return {
    date: row.date as unknown as DateISO,
    split: row.split as unknown as Workout['split'],
    exercises: row.exercises as unknown as DayPlan['exercises'],
  }
}
function toDayPlanRow(p: DayPlan, weekStart: string): DayPlanRow {
  return {
    id: `${weekStart}-${p.date}`,
    weekStart,
    date: p.date,
    split: p.split,
    exercises: p.exercises,
  }
}

// ---------- body ----------

export class BodyRepositoryImpl implements BodyRepository {
  async getWeightEntries(): Promise<WeightEntry[]> {
    const rows = await db.weightEntries.toArray()
    return rows.map(toWeightEntry)
  }
  async saveWeightEntry(entry: WeightEntry): Promise<void> {
    await db.weightEntries.put(toWeightEntryRow(entry))
  }
  async deleteWeightEntry(id: string): Promise<void> {
    await db.weightEntries.delete(id)
  }
  async getMeasurementEntries(): Promise<MeasurementEntry[]> {
    const rows = await db.measurementEntries.toArray()
    return rows.map(toMeasurementEntry)
  }
  async saveMeasurementEntry(entry: MeasurementEntry): Promise<void> {
    await db.measurementEntries.put(toMeasurementEntryRow(entry))
  }
  async getPhotos(): Promise<Photo[]> {
    const rows = await db.photos.toArray()
    return rows.map(toPhoto)
  }
  async savePhoto(photo: Photo): Promise<void> {
    await db.photos.put(toPhotoRow(photo))
  }
  async deletePhoto(id: string): Promise<void> {
    await db.photos.delete(id)
  }
  async getProfile(): Promise<BodyProfile | null> {
    const rows = await db.bodyProfile.toArray()
    return firstRow(rows).then((r) => (r ? toBodyProfile(r) : null))
  }
  async saveProfile(profile: BodyProfile): Promise<void> {
    await db.bodyProfile.put(toBodyProfileRow(profile))
  }
}

function toWeightEntry(row: WeightEntryRow): WeightEntry {
  return {
    id: branded<BodyEntryId>(row.id),
    date: row.date as unknown as DateISO,
    weightKg: row.weightKg as unknown as Kilograms,
    source: row.source as unknown as WeightEntry['source'],
  }
}
function toWeightEntryRow(e: WeightEntry): WeightEntryRow {
  return { id: e.id, date: e.date, weightKg: e.weightKg, source: e.source }
}
function toMeasurementEntry(row: MeasurementEntryRow): MeasurementEntry {
  return {
    id: branded<MeasurementId>(row.id),
    date: row.date as unknown as DateISO,
    site: row.site as unknown as MeasurementEntry['site'],
    valueCm: row.valueCm as unknown as Centimeters,
  }
}
function toMeasurementEntryRow(e: MeasurementEntry): MeasurementEntryRow {
  return { id: e.id, date: e.date, site: e.site, valueCm: e.valueCm }
}
function toPhoto(row: PhotoRow): Photo {
  return {
    id: branded<PhotoId>(row.id),
    date: row.date as unknown as DateISO,
    view: row.view as unknown as Photo['view'],
    blob: row.blob,
    thumbnail: row.thumbnail,
    width: row.width,
    height: row.height,
  }
}
function toPhotoRow(p: Photo): PhotoRow {
  return { id: p.id, date: p.date, view: p.view, blob: p.blob, thumbnail: p.thumbnail, width: p.width, height: p.height }
}
function toBodyProfile(row: BodyProfileRow): BodyProfile {
  return {
    userId: row.userId,
    age: row.age ?? undefined,
    heightCm: row.heightCm ? branded<Centimeters>(row.heightCm) : undefined,
    sex: row.sex as unknown as BodyProfile['sex'],
    units: row.units as unknown as BodyProfile['units'],
    goal: row.goal as unknown as BodyProfile['goal'],
    experience: row.experience as unknown as BodyProfile['experience'],
    daysPerWeek: row.daysPerWeek as unknown as BodyProfile['daysPerWeek'],
    sessionLength: row.sessionLength as unknown as BodyProfile['sessionLength'],
    barEnabled: row.barEnabled,
    assessmentCompleted: row.assessmentCompleted,
    createdAt: row.createdAt as unknown as DateISO,
    updatedAt: row.updatedAt as unknown as DateISO,
  }
}
function toBodyProfileRow(p: BodyProfile): BodyProfileRow {
  return {
    userId: p.userId,
    age: p.age ?? null,
    heightCm: p.heightCm ?? null,
    sex: p.sex ?? null,
    units: p.units,
    goal: p.goal,
    experience: p.experience,
    daysPerWeek: p.daysPerWeek,
    sessionLength: p.sessionLength,
    barEnabled: p.barEnabled,
    assessmentCompleted: p.assessmentCompleted,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

// ---------- food ----------

export class FoodRepositoryImpl implements FoodRepository {
  async getAll(): Promise<Food[]> {
    const rows = await db.foods.toArray()
    return rows.map(toFood)
  }
  async search(query: string): Promise<Food[]> {
    const q = query.toLowerCase()
    const rows = await db.foods
      .filter((f) => f.name.toLowerCase().includes(q) || (f.brand ?? '').toLowerCase().includes(q))
      .toArray()
    return rows.map(toFood)
  }
  async getById(id: string): Promise<Food | null> {
    const row = await db.foods.get(id)
    return row ? toFood(row) : null
  }
  async save(food: Food): Promise<void> {
    await db.foods.put(toFoodRow(food))
  }
  async delete(id: string): Promise<void> {
    await db.foods.delete(id)
  }
  async getCustom(): Promise<Food[]> {
    const rows = await db.foods.filter((f) => f.custom === true).toArray()
    return rows.map(toFood)
  }
  /** Populate the food database from the typed content seed when empty (idempotent). */
  async ensureSeeded(seed: Food[]): Promise<void> {
    const existing = await db.foods.count()
    if (existing > 0) return
    await db.foods.bulkPut(seed.map(toFoodRow))
  }
}

function toFood(row: FoodRow): Food {
  return {
    id: branded<FoodId>(row.id),
    name: row.name,
    brand: row.brand ?? undefined,
    kcalPer100g: row.kcalPer100g,
    proteinGPer100g: row.proteinGPer100g,
    fatGPer100g: row.fatGPer100g,
    carbsGPer100g: row.carbsGPer100g,
    category: row.category,
    householdMeasure: row.householdMeasure ?? undefined,
    custom: row.custom,
    createdAt: row.createdAt as unknown as DateISO,
  }
}
function toFoodRow(f: Food): FoodRow {
  return {
    id: f.id,
    name: f.name,
    brand: f.brand ?? null,
    kcalPer100g: f.kcalPer100g,
    proteinGPer100g: f.proteinGPer100g,
    fatGPer100g: f.fatGPer100g,
    carbsGPer100g: f.carbsGPer100g,
    category: f.category,
    householdMeasure: f.householdMeasure ?? null,
    custom: f.custom,
    createdAt: f.createdAt,
  }
}

// ---------- food log ----------

export class FoodLogRepositoryImpl implements FoodLogRepository {
  async getByDate(date: string): Promise<FoodLogEntry[]> {
    const rows = await db.foodLogEntries.where('date').equals(date).toArray()
    return rows.map(toFoodLogEntry)
  }
  async getRange(from: string, to: string): Promise<FoodLogEntry[]> {
    const rows = await db.foodLogEntries.filter((e) => e.date >= from && e.date <= to).toArray()
    return rows.map(toFoodLogEntry)
  }
  async save(entry: FoodLogEntry): Promise<void> {
    await db.foodLogEntries.put(toFoodLogEntryRow(entry))
  }
  async delete(id: string): Promise<void> {
    await db.foodLogEntries.delete(id)
  }
  async getDailyTotals(date: string): Promise<DailyTotals | null> {
    const entries = await this.getByDate(date)
    if (entries.length === 0) return null
    return totals(entries, date)
  }
  async getWeeklyAverage(from: string, to: string): Promise<DailyTotals | null> {
    const entries = await this.getRange(from, to)
    if (entries.length === 0) return null
    const byDate = new Map<string, FoodLogEntry[]>()
    for (const e of entries) {
      const arr = byDate.get(e.date) ?? []
      arr.push(e)
      byDate.set(e.date, arr)
    }
    const days = Array.from(byDate.values()).map((arr) => totals(arr, arr[0].date))
    const n = days.length
    return {
      date: branded<DateISO>(to),
      kcal: Math.round(days.reduce((s, d) => s + d.kcal, 0) / n),
      proteinG: Math.round(days.reduce((s, d) => s + d.proteinG, 0) / n),
      fatG: Math.round(days.reduce((s, d) => s + d.fatG, 0) / n),
      carbsG: Math.round(days.reduce((s, d) => s + d.carbsG, 0) / n),
      waterMl: Math.round(days.reduce((s, d) => s + d.waterMl, 0) / n),
    }
  }
}

function toFoodLogEntry(row: FoodLogEntryRow): FoodLogEntry {
  return {
    id: row.id,
    foodId: branded<FoodId>(row.foodId),
    foodName: row.foodName,
    grams: row.grams,
    kcal: row.kcal,
    proteinG: row.proteinG,
    fatG: row.fatG,
    carbsG: row.carbsG,
    meal: row.meal as unknown as FoodLogEntry['meal'],
    date: row.date as unknown as DateISO,
  }
}
function toFoodLogEntryRow(e: FoodLogEntry): FoodLogEntryRow {
  return {
    id: e.id,
    foodId: e.foodId,
    foodName: e.foodName,
    grams: e.grams,
    kcal: e.kcal,
    proteinG: e.proteinG,
    fatG: e.fatG,
    carbsG: e.carbsG,
    meal: e.meal,
    date: e.date,
  }
}

/**
 * Water is tracked as zero-kcal food-log entries with the reserved
 * foodId 'water' (grams = ml). Contracts are frozen, so this keeps the
 * log schema unchanged while making DailyTotals.waterMl real.
 */
function totals(entries: FoodLogEntry[], date: string): DailyTotals {
  const foodEntries = entries.filter((e) => e.foodId !== WATER_FOOD_ID)
  return {
    date: branded<DateISO>(date),
    kcal: Math.round(foodEntries.reduce((s, e) => s + e.kcal, 0)),
    proteinG: Math.round(foodEntries.reduce((s, e) => s + e.proteinG, 0)),
    fatG: Math.round(foodEntries.reduce((s, e) => s + e.fatG, 0)),
    carbsG: Math.round(foodEntries.reduce((s, e) => s + e.carbsG, 0)),
    waterMl: entries.reduce((s, e) => (e.foodId === WATER_FOOD_ID ? s + e.grams : s), 0),
  }
}

// ---------- settings ----------

export class SettingsRepositoryImpl implements SettingsRepository {
  async get(): Promise<UserSettings> {
    const rows = await db.settings.toArray()
    const row = await firstRow(rows)
    if (!row) {
      const def: UserSettings = {
        theme: 'light',
        sound: 'on',
        defaultRestSeconds: 60,
        units: 'metric',
        wakeLock: true,
        reducedMotion: false,
      }
      await db.settings.put({ id: 'settings', theme: def.theme, sound: def.sound, defaultRestSeconds: def.defaultRestSeconds, units: def.units, wakeLock: def.wakeLock, reducedMotion: def.reducedMotion })
      return def
    }
    return toSettings(row)
  }
  async save(settings: UserSettings): Promise<void> {
    await db.settings.put({ id: 'settings', theme: settings.theme, sound: settings.sound, defaultRestSeconds: settings.defaultRestSeconds, units: settings.units, wakeLock: settings.wakeLock, reducedMotion: settings.reducedMotion })
  }
}

function toSettings(row: SettingsRow): UserSettings {
  return {
    theme: row.theme as unknown as UserSettings['theme'],
    sound: row.sound as unknown as UserSettings['sound'],
    defaultRestSeconds: row.defaultRestSeconds,
    units: row.units as unknown as UserSettings['units'],
    wakeLock: row.wakeLock,
    reducedMotion: row.reducedMotion,
  }
}

// ---------- gamification ----------

export class GamificationRepositoryImpl implements GamificationRepository {
  async getBadges(): Promise<Badge[]> {
    const rows = await db.badges.toArray()
    return rows.map(toBadge)
  }
  async getAwards(): Promise<BadgeAward[]> {
    const rows = await db.badgeAwards.toArray()
    return rows.map(toBadgeAward)
  }
  async award(badgeId: string): Promise<void> {
    await db.badgeAwards.add({ badgeId, earnedAt: new Date().toISOString() })
  }
  async getStreak(): Promise<Streak> {
    const rows = await db.gamification.toArray()
    const row = await firstRow(rows)
    return row
      ? { current: row.streakCurrent, best: row.streakBest, lastTrainingDate: row.lastTrainingDate ?? undefined }
      : { current: 0, best: 0 }
  }
  async saveStreak(streak: Streak): Promise<void> {
    const rows = await db.gamification.toArray()
    const base = (await firstRow(rows)) ?? { id: 'gam', totalXP: 0, level: 1, streakCurrent: 0, streakBest: 0, lastTrainingDate: null }
    await db.gamification.put({
      ...base,
      streakCurrent: streak.current,
      streakBest: streak.best,
      lastTrainingDate: streak.lastTrainingDate ?? null,
    })
  }
  async getLevel(): Promise<LevelInfo> {
    const rows = await db.gamification.toArray()
    const row = await firstRow(rows)
    const total = row?.totalXP ?? 0
    const level = 1 + Math.floor(total / 1000)
    return { level, rank: rankFor(level), xp: total, xpToNext: level * 1000 - total }
  }
  async saveLevel(level: LevelInfo): Promise<void> {
    const rows = await db.gamification.toArray()
    const base = (await firstRow(rows)) ?? { id: 'gam', totalXP: 0, level: 1, streakCurrent: 0, streakBest: 0, lastTrainingDate: null }
    await db.gamification.put({ ...base, totalXP: level.xp, level: level.level })
  }
  async getTotalXP(): Promise<number> {
    const rows = await db.gamification.toArray()
    const row = await firstRow(rows)
    return row?.totalXP ?? 0
  }
  async addXP(amount: number): Promise<void> {
    const rows = await db.gamification.toArray()
    const base = (await firstRow(rows)) ?? { id: 'gam', totalXP: 0, level: 1, streakCurrent: 0, streakBest: 0, lastTrainingDate: null }
    await db.gamification.put({ ...base, totalXP: base.totalXP + amount })
  }
}

function toBadge(row: BadgeRow): Badge {
  return {
    id: branded<BadgeId>(row.id),
    name: row.name,
    description: row.description,
    icon: row.icon,
    category: row.category as unknown as Badge['category'],
    xpReward: row.xpReward,
  }
}
function toBadgeAward(row: BadgeAwardRow): BadgeAward {
  return { badgeId: branded<BadgeId>(row.badgeId), earnedAt: row.earnedAt }
}

function rankFor(level: number): RankTitle {
  const ranks = ['Recruit', 'Private', 'Corporal', 'Sergeant', 'Lieutenant', 'Captain', 'Major', 'Colonel', 'General', 'Field Marshal']
  return ranks[Math.min(level - 1, ranks.length - 1)] as RankTitle
}

// ---------- photo ----------

export class PhotoRepositoryImpl implements PhotoRepository {
  async get(id: string): Promise<Photo | null> {
    const row = await db.photos.get(id)
    return row ? toPhoto(row) : null
  }
  async save(photo: Photo): Promise<void> {
    await db.photos.put(toPhotoRow(photo))
  }
  async delete(id: string): Promise<void> {
    await db.photos.delete(id)
  }
}
