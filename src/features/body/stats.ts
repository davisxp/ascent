/**
 * Body stats — pure helpers for weight series, measurement deltas, BMI.
 */

import type { WeightEntry, MeasurementEntry, MeasurementSite } from '../../domain/index'

export type WeightPoint = { date: string; kg: number }

/** Weight entries sorted oldest → newest for charting. */
export function weightSeries(entries: WeightEntry[]): WeightPoint[] {
  return [...entries]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((e) => ({ date: e.date, kg: e.weightKg }))
}

export type SiteSummary = {
  site: MeasurementSite
  /** Most recent value in cm. */
  latest: number
  /** Second-most-recent value, or null with only one entry. */
  previous: number | null
  date: string
}

/** Latest value per site with the delta against the previous entry. */
export function latestBySite(entries: MeasurementEntry[]): SiteSummary[] {
  const bySite = new Map<MeasurementSite, MeasurementEntry[]>()
  for (const e of entries) {
    const arr = bySite.get(e.site) ?? []
    arr.push(e)
    bySite.set(e.site, arr)
  }
  const out: SiteSummary[] = []
  for (const [site, arr] of bySite) {
    const sorted = [...arr].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    out.push({
      site,
      latest: sorted[0].valueCm,
      previous: sorted.length > 1 ? sorted[1].valueCm : null,
      date: sorted[0].date,
    })
  }
  return out.sort((a, b) => a.site.localeCompare(b.site))
}

export function bmi(weightKg: number, heightCm: number): number {
  if (weightKg <= 0 || heightCm <= 0) return 0
  const m = heightCm / 100
  return Math.round((weightKg / (m * m)) * 10) / 10
}

export function bmiLabel(value: number): string {
  if (value === 0) return '—'
  if (value < 18.5) return 'Underweight'
  if (value < 25) return 'Healthy range'
  if (value < 30) return 'Overweight'
  return 'Obese range'
}
