/**
 * Fuel chart tests — zero-filled daily totals over a window.
 */

import { describe, expect, it } from 'vitest'
import { lastNDays, totalsByDay, dailyTotalsSeries } from '../../src/features/fuel/chart'
import { WATER_FOOD_ID } from '../../src/domain/fuel'
import { branded } from '../../src/domain/ids'
import type { FoodId, DateISO } from '../../src/domain/ids'
import type { FoodLogEntry } from '../../src/domain/index'

const entry = (date: string, overrides: Partial<FoodLogEntry> = {}): FoodLogEntry => ({
  id: `e-${date}-${overrides.foodId ?? 'food'}-${overrides.kcal ?? 0}`,
  foodId: branded<FoodId>('food-chicken-breast'),
  foodName: 'Chicken Breast',
  grams: 100,
  kcal: 165,
  proteinG: 31,
  fatG: 3.6,
  carbsG: 0,
  meal: 'lunch',
  date: branded<DateISO>(date),
  ...overrides,
})

describe('lastNDays', () => {
  it('returns ascending keys ending today', () => {
    const keys = lastNDays(3, new Date('2026-11-15T12:00:00Z'))
    expect(keys).toEqual(['2026-11-13', '2026-11-14', '2026-11-15'])
  })
})

describe('totalsByDay', () => {
  it('sums food macros per day and keeps water separate', () => {
    const map = totalsByDay([
      entry('2026-11-15', { kcal: 165, proteinG: 31 }),
      entry('2026-11-15', { kcal: 100, proteinG: 5 }),
      entry('2026-11-15', { foodId: WATER_FOOD_ID as unknown as FoodId, grams: 500, kcal: 0 }),
      entry('2026-11-14', { kcal: 50, proteinG: 2 }),
    ])
    const d15 = map.get('2026-11-15')
    expect(d15?.kcal).toBe(265)
    expect(d15?.proteinG).toBe(36)
    expect(d15?.waterMl).toBe(500)
    const d14 = map.get('2026-11-14')
    expect(d14?.kcal).toBe(50)
    expect(d14?.waterMl).toBe(0)
  })
})

describe('dailyTotalsSeries', () => {
  it('zero-fills days with no entries', () => {
    const series = dailyTotalsSeries(
      [entry('2026-11-14', { kcal: 200 })],
      3,
      new Date('2026-11-15T12:00:00Z'),
    )
    expect(series).toHaveLength(3)
    expect(series[0]).toMatchObject({ date: '2026-11-13', kcal: 0, waterMl: 0 })
    expect(series[1]).toMatchObject({ date: '2026-11-14', kcal: 200 })
    expect(series[2]).toMatchObject({ date: '2026-11-15', kcal: 0 })
  })

  it('ignores entries outside the window', () => {
    const series = dailyTotalsSeries(
      [entry('2026-11-01', { kcal: 999 })],
      3,
      new Date('2026-11-15T12:00:00Z'),
    )
    expect(series.every((d) => d.kcal === 0)).toBe(true)
  })
})
