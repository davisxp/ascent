/**
 * Domain primitives — branded IDs and shared value types.
 * No feature imports. Pure TypeScript, no dependencies.
 */

export type ExerciseId = string & { readonly __brand: unique symbol }
export type WorkoutId = string & { readonly __brand: unique symbol }
export type SetId = string & { readonly __brand: unique symbol }
export type BodyEntryId = string & { readonly __brand: unique symbol }
export type MeasurementId = string & { readonly __brand: unique symbol }
export type PhotoId = string & { readonly __brand: unique symbol }
export type FoodId = string & { readonly __brand: unique symbol }
export type MealId = string & { readonly __brand: unique symbol }
export type BadgeId = string & { readonly __brand: unique symbol }
export type TaskId = string & { readonly __brand: unique symbol }
export type FinanceId = string & { readonly __brand: unique symbol }
export type InvestmentId = string & { readonly __brand: unique symbol }
export type WardrobeId = string & { readonly __brand: unique symbol }
export type GroomingId = string & { readonly __brand: unique symbol }
export type NetworkId = string & { readonly __brand: unique symbol }
export type CareerId = string & { readonly __brand: unique symbol }
export type MedicalId = string & { readonly __brand: unique symbol }
export type EstateId = string & { readonly __brand: unique symbol }
export type ChainId = string & { readonly __brand: unique symbol }
export type SkillNodeId = string & { readonly __brand: unique symbol }
export type UserId = string & { readonly __brand: unique symbol }

export const id = <T extends string>(): T => crypto.randomUUID() as T

/**
 * Cast a value to a branded type. Branded types are a compile-time only
 * marker; no runtime value is added. Used at repository boundaries where
 * storage returns plain values.
 */
export const branded = <T>(value: unknown): T => value as unknown as T

export type DateISO = string & { readonly __brand: unique symbol }
export const todayISO = (): DateISO => new Date().toISOString().slice(0, 10) as DateISO

export type Milliseconds = number & { readonly __brand: unique symbol }
export type Seconds = number & { readonly __brand: unique symbol }
export type Kilograms = number & { readonly __brand: unique symbol }
export type Pounds = number & { readonly __brand: unique symbol }
export type Centimeters = number & { readonly __brand: unique symbol }

export type RPE = number & { readonly __brand: unique symbol } // 1-10
