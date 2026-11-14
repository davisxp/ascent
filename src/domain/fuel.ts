/**
 * Fuel domain types — nutrition logging.
 */

import type { FoodId, DateISO } from './ids'

export type MealName = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type Food = {
  id: FoodId
  name: string
  brand?: string
  // per 100g
  kcalPer100g: number
  proteinGPer100g: number
  fatGPer100g: number
  carbsGPer100g: number
  category: string
  householdMeasure?: { name: string; grams: number }
  custom: boolean
  createdAt: DateISO
}

export type FoodLogEntry = {
  id: string
  foodId: FoodId
  foodName: string
  grams: number
  kcal: number
  proteinG: number
  fatG: number
  carbsG: number
  meal: MealName
  date: DateISO
}

export type DailyTotals = {
  date: DateISO
  kcal: number
  proteinG: number
  fatG: number
  carbsG: number
  waterMl: number
}

export type NutritionTarget = {
  kcal: number
  proteinG: number
  fatG: number
  carbsG: number
  waterMl: number
  tdee: number
  tdeeMultiplier: number
  goal: 'cut' | 'maintain' | 'lean-gain'
}
