/**
 * Body stats tests — weight series, measurement deltas, BMI.
 */

import { describe, expect, it } from 'vitest'
import { weightSeries, latestBySite, bmi, bmiLabel } from '../../src/features/body/stats'
import { branded } from '../../src/domain/ids'
import type { WeightEntry, MeasurementEntry, MeasurementSite } from '../../src/domain/index'

const weight = (date: string, kg: number): WeightEntry => ({
  id: branded<never>(`w-${date}-${kg}`),
  date: branded<never>(date),
  weightKg: branded<never>(kg),
  source: 'manual',
})

const measure = (date: string, site: MeasurementSite, valueCm: number): MeasurementEntry => ({
  id: branded<never>(`m-${date}-${site}`),
  date: branded<never>(date),
  site,
  valueCm: branded<never>(valueCm),
})

describe('weightSeries', () => {
  it('sorts entries oldest to newest regardless of input order', () => {
    const out = weightSeries([
      weight('2026-11-10', 75),
      weight('2026-11-08', 75.5),
      weight('2026-11-12', 74.8),
    ])
    expect(out.map((p) => p.date)).toEqual(['2026-11-08', '2026-11-10', '2026-11-12'])
    expect(out[2].kg).toBe(74.8)
  })

  it('returns an empty series for no entries', () => {
    expect(weightSeries([])).toEqual([])
  })
})

describe('latestBySite', () => {
  it('returns the newest value per site with the previous delta', () => {
    const out = latestBySite([
      measure('2026-11-01', 'waist', 82),
      measure('2026-11-10', 'waist', 80.5),
      measure('2026-11-05', 'arm', 33),
    ])
    const waist = out.find((s) => s.site === 'waist')
    expect(waist?.latest).toBe(80.5)
    expect(waist?.previous).toBe(82)
    expect(waist?.date).toBe('2026-11-10')
    const arm = out.find((s) => s.site === 'arm')
    expect(arm?.latest).toBe(33)
    expect(arm?.previous).toBeNull()
  })
})

describe('bmi', () => {
  it('computes kg/m²', () => {
    expect(bmi(70, 175)).toBe(22.9)
  })

  it('returns 0 for invalid inputs', () => {
    expect(bmi(0, 175)).toBe(0)
    expect(bmi(70, 0)).toBe(0)
  })

  it('labels the WHO bands', () => {
    expect(bmiLabel(17)).toBe('Underweight')
    expect(bmiLabel(22.9)).toBe('Healthy range')
    expect(bmiLabel(27)).toBe('Overweight')
    expect(bmiLabel(32)).toBe('Obese range')
    expect(bmiLabel(0)).toBe('—')
  })
})
