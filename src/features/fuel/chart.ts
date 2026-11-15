/**
 * Fuel chart helpers — zero-filled daily totals over a window.
 * Pure deterministic logic (dates injected as UTC ISO keys to match
 * how entries are saved via todayISO()).
 */

import type { FoodLogEntry } from '../../domain/index'
import { WATER_FOOD_ID } from '../../domain/fuel'

export type DayTotals = {
  date: string
  kcal: number
  proteinG: number
  fatG: number
  carbsG: number
  waterMl: number
}

const dateKey = (d: Date): string => d.toISOString().slice(0, 10)

/** Ascending list of `n` date keys ending at `today` (inclusive). */
export function lastNDays(n: number, today: Date): string[] {
  const keys: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000)
    keys.push(dateKey(d))
  }
  return keys
}

/** Sum entries per day; food entries exclude water, water entries sum as ml. */
export function totalsByDay(entries: FoodLogEntry[]): Map<string, DayTotals> {
  const map = new Map<string, DayTotals>()
  const add = (date: string, field: 'kcal' | 'proteinG' | 'fatG' | 'carbsG', value: number) => {
    const day = map.get(date) ?? {
      date,
      kcal: 0,
      proteinG: 0,
      fatG: 0,
      carbsG: 0,
      waterMl: 0,
    }
    day[field] += value
    map.set(date, day)
  }
  for (const e of entries) {
    if (e.foodId === WATER_FOOD_ID) {
      const day = map.get(e.date) ?? { date: e.date, kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, waterMl: 0 }
      day.waterMl += e.grams
      map.set(e.date, day)
    } else {
      add(e.date, 'kcal', e.kcal)
      add(e.date, 'proteinG', e.proteinG)
      add(e.date, 'fatG', e.fatG)
      add(e.date, 'carbsG', e.carbsG)
    }
  }
  return map
}

/** Zero-filled totals for each of the last `n` days ending at `today`. */
export function dailyTotalsSeries(
  entries: FoodLogEntry[],
  n: number,
  today: Date,
): DayTotals[] {
  const map = totalsByDay(entries)
  return lastNDays(n, today).map(
    (date) =>
      map.get(date) ?? { date, kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, waterMl: 0 },
  )
}
