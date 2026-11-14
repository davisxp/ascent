/**
 * Nutrition math — Mifflin-St Jeor TDEE, macros, editable targets.
 * Pure deterministic logic.
 */

import type { NutritionTarget } from '../domain/fuel'
import type { Centimeters, Kilograms } from '../domain/ids'

export type ActivityMultiplier = 1.2 | 1.375 | 1.55 | 1.725 | 1.9

export const ACTIVITY_MULTIPLIERS: Record<string, ActivityMultiplier> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
} as const

export type NutritionInputs = {
  weightKg: Kilograms
  heightCm: Centimeters
  age: number
  sex: 'male' | 'female' | 'other'
  activity: keyof typeof ACTIVITY_MULTIPLIERS
  goal: 'cut' | 'maintain' | 'lean-gain'
}

/**
 * Mifflin-St Jeor BMR.
 */
export function bmrMifflinStJeor(inputs: NutritionInputs): number {
  const { weightKg, heightCm, age, sex } = inputs
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

/**
 * TDEE = BMR × activity multiplier.
 */
export function tdee(inputs: NutritionInputs): number {
  return bmrMifflinStJeor(inputs) * ACTIVITY_MULTIPLIERS[inputs.activity]
}

/**
 * Goal adjustment to kcal.
 */
export function goalKcal(tdeeKcal: number, goal: 'cut' | 'maintain' | 'lean-gain'): number {
  switch (goal) {
    case 'cut':
      return Math.round(tdeeKcal * 0.8) // ~20% deficit
    case 'lean-gain':
      return Math.round(tdeeKcal * 1.1) // ~10% surplus
    default:
      return Math.round(tdeeKcal)
  }
}

/**
 * Macro split: protein 1.8 g/kg, fat 25% kcal, carbs remainder.
 */
export function macros(
  kcal: number,
  weightKg: Kilograms,
): { proteinG: number; fatG: number; carbsG: number } {
  const proteinG = Math.round(1.8 * weightKg)
  const fatG = Math.round((0.25 * kcal) / 9)
  const carbsG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4))
  return { proteinG, fatG, carbsG }
}

/**
 * Build a full nutrition target.
 */
export function buildNutritionTarget(
  inputs: NutritionInputs,
  waterMl = 2500,
): NutritionTarget {
  const tdeeKcal = tdee(inputs)
  const kcal = goalKcal(tdeeKcal, inputs.goal)
  const { proteinG, fatG, carbsG } = macros(kcal, inputs.weightKg)
  return {
    kcal,
    proteinG,
    fatG,
    carbsG,
    waterMl,
    tdee: Math.round(tdeeKcal),
    tdeeMultiplier: ACTIVITY_MULTIPLIERS[inputs.activity],
    goal: inputs.goal,
  }
}

/**
 * Per-food macros for a given gram amount.
 */
export function foodMacros(
  kcalPer100g: number,
  proteinGPer100g: number,
  fatGPer100g: number,
  carbsGPer100g: number,
  grams: number,
): { kcal: number; proteinG: number; fatG: number; carbsG: number } {
  const f = grams / 100
  return {
    kcal: Math.round(kcalPer100g * f),
    proteinG: Math.round(proteinGPer100g * f),
    fatG: Math.round(fatGPer100g * f),
    carbsG: Math.round(carbsGPer100g * f),
  }
}

/**
 * Adherence: protein grams / target protein.
 */
export function proteinAdherence(actual: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, Math.round((actual / target) * 100))
}
