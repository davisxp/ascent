/**
 * Domain barrel — all shared types.
 * Features import from contracts; domain types are re-exported here for internal use.
 */

export type {
  ExerciseId,
  WorkoutId,
  SetId,
  BodyEntryId,
  MeasurementId,
  PhotoId,
  FoodId,
  MealId,
  BadgeId,
  ChainId,
  SkillNodeId,
  UserId,
  DateISO,
  Milliseconds,
  Seconds,
  Kilograms,
  Pounds,
  Centimeters,
  RPE,
  id,
  todayISO,
} from './ids'
export type {
  Metric,
  Equipment,
  Pattern,
  Difficulty,
  UnlockCriterion,
  Exercise,
  ChainStep,
  Chain,
  ChainPlacement,
  SetOutcome,
} from './exercise'
export type {
  SetLog,
  ExerciseLog,
  Workout,
  DayPlan,
  Mesocycle,
  WeekPlan,
  Placement,
} from './workout'
export type {
  WeightEntry,
  MeasurementEntry,
  Photo,
  BodyProfile,
  MeasurementSite,
} from './body'
export type {
  Food,
  FoodLogEntry,
  DailyTotals,
  NutritionTarget,
  MealName,
} from './fuel'
export type {
  RankTitle,
  LevelInfo,
  Badge,
  BadgeAward,
  Streak,
  XpEvent,
  XP,
} from './gamification'
export type { UserSettings, Theme, Sound, defaultSettings } from './preferences'
