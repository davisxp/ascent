/**
 * Repository interfaces.
 * All persistence goes through repositories — no component touches Dexie directly.
 * Implementations live in src/data/repositories/.
 */

import type {
  ExerciseId,
  WorkoutId,
  BodyEntryId,
  PhotoId,
  FoodId,
  BadgeId,
  DateISO,
} from '../domain/ids'
import type { Exercise } from '../domain/exercise'
import type { Workout, DayPlan } from '../domain/workout'
import type { WeightEntry, MeasurementEntry, Photo, BodyProfile } from '../domain/body'
import type { Food, FoodLogEntry, DailyTotals } from '../domain/fuel'
import type { Badge, BadgeAward, LevelInfo, Streak } from '../domain/gamification'
import type { UserSettings } from '../domain/preferences'
import type { Task } from '../domain/task'
import type { TaskId } from '../domain/ids'
import type { FinanceEntry } from '../domain/finance'
import type { FinanceId } from '../domain/ids'
import type { Investment } from '../domain/investment'
import type { InvestmentId } from '../domain/ids'
import type { WardrobeItem } from '../domain/wardrobe'
import type { WardrobeId } from '../domain/ids'
import type { GroomingRoutine } from '../domain/grooming'
import type { GroomingId } from '../domain/ids'
import type { NetworkContact } from '../domain/network'
import type { NetworkId } from '../domain/ids'
import type { CareerGoal } from '../domain/career'
import type { CareerId } from '../domain/ids'
import type { MedicalNote } from '../domain/medical'
import type { MedicalId } from '../domain/ids'
import type { EstateItem } from '../domain/estate'
import type { EstateId } from '../domain/ids'

export interface ExerciseRepository {
  getAll(): Promise<Exercise[]>
  getById(id: ExerciseId): Promise<Exercise | null>
  getByChain(chainId: string): Promise<Exercise[]>
  seed(exercises: Exercise[]): Promise<void>
}

export interface WorkoutRepository {
  getAll(): Promise<Workout[]>
  getById(id: WorkoutId): Promise<Workout | null>
  getByDate(date: DateISO): Promise<Workout | null>
  save(workout: Workout): Promise<void>
  delete(id: WorkoutId): Promise<void>
}

export interface DayPlanRepository {
  getWeek(startDate: DateISO): Promise<DayPlan[]>
  saveWeek(startDate: DateISO, plans: DayPlan[]): Promise<void>
}

export interface BodyRepository {
  getWeightEntries(): Promise<WeightEntry[]>
  saveWeightEntry(entry: WeightEntry): Promise<void>
  deleteWeightEntry(id: BodyEntryId): Promise<void>
  getMeasurementEntries(): Promise<MeasurementEntry[]>
  saveMeasurementEntry(entry: MeasurementEntry): Promise<void>
  getPhotos(): Promise<Photo[]>
  savePhoto(photo: Photo): Promise<void>
  deletePhoto(id: PhotoId): Promise<void>
  getProfile(): Promise<BodyProfile | null>
  saveProfile(profile: BodyProfile): Promise<void>
}

export interface FoodRepository {
  getAll(): Promise<Food[]>
  search(query: string): Promise<Food[]>
  getById(id: FoodId): Promise<Food | null>
  save(food: Food): Promise<void>
  delete(id: FoodId): Promise<void>
  getCustom(): Promise<Food[]>
}

export interface FoodLogRepository {
  getByDate(date: DateISO): Promise<FoodLogEntry[]>
  getRange(from: DateISO, to: DateISO): Promise<FoodLogEntry[]>
  save(entry: FoodLogEntry): Promise<void>
  delete(id: string): Promise<void>
  getDailyTotals(date: DateISO): Promise<DailyTotals | null>
  getWeeklyAverage(from: DateISO, to: DateISO): Promise<DailyTotals | null>
}

export interface SettingsRepository {
  get(): Promise<UserSettings>
  save(settings: UserSettings): Promise<void>
}

export interface GamificationRepository {
  getBadges(): Promise<Badge[]>
  getAwards(): Promise<BadgeAward[]>
  award(badgeId: BadgeId): Promise<void>
  getStreak(): Promise<Streak>
  saveStreak(streak: Streak): Promise<void>
  getLevel(): Promise<LevelInfo>
  saveLevel(level: LevelInfo): Promise<void>
  getTotalXP(): Promise<number>
  addXP(amount: number): Promise<void>
}

export interface PhotoRepository {
  get(id: PhotoId): Promise<Photo | null>
  save(photo: Photo): Promise<void>
  delete(id: PhotoId): Promise<void>
}

export interface TaskRepository {
  getAll(): Promise<Task[]>
  getById(id: TaskId): Promise<Task | null>
  save(task: Task): Promise<void>
  delete(id: TaskId): Promise<void>
}

export interface FinanceRepository {
  getAll(): Promise<FinanceEntry[]>
  save(entry: FinanceEntry): Promise<void>
  delete(id: FinanceId): Promise<void>
}

export interface InvestmentRepository {
  getAll(): Promise<Investment[]>
  save(entry: Investment): Promise<void>
  delete(id: InvestmentId): Promise<void>
}

export interface WardrobeRepository {
  getAll(): Promise<WardrobeItem[]>
  save(item: WardrobeItem): Promise<void>
  delete(id: WardrobeId): Promise<void>
}

export interface GroomingRepository {
  getAll(): Promise<GroomingRoutine[]>
  save(routine: GroomingRoutine): Promise<void>
  delete(id: GroomingId): Promise<void>
}

export interface NetworkRepository {
  getAll(): Promise<NetworkContact[]>
  save(contact: NetworkContact): Promise<void>
  delete(id: NetworkId): Promise<void>
}

export interface CareerRepository {
  getAll(): Promise<CareerGoal[]>
  save(goal: CareerGoal): Promise<void>
  delete(id: CareerId): Promise<void>
}

export interface MedicalRepository {
  getAll(): Promise<MedicalNote[]>
  save(note: MedicalNote): Promise<void>
  delete(id: MedicalId): Promise<void>
}

export interface EstateRepository {
  getAll(): Promise<EstateItem[]>
  save(item: EstateItem): Promise<void>
  delete(id: EstateId): Promise<void>
}
