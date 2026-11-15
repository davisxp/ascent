/**
 * Insights charts — pure transforms from workout history to chart
 * series. No repository access; screens pass data in.
 */

import type { Workout, Metric, Pattern } from '../../domain/index'

export type HeatCell = {
  date: string
  count: number
  future: boolean
}

/**
 * 12-week training heatmap: columns are weeks (oldest first),
 * rows are Mon..Sun. Counts completed workouts per day.
 */
export function heatmapGrid(
  workouts: Workout[],
  weeks: number,
  today: Date,
): HeatCell[][] {
  const todayKey = isoDay(today)
  const dow = (today.getDay() + 6) % 7 // 0 = Monday
  const currentMonday = addDays(today, -dow)
  const start = addDays(currentMonday, -(weeks - 1) * 7)

  const counts = new Map<string, number>()
  for (const w of workouts) {
    if (!w.completedAt) continue
    counts.set(w.date, (counts.get(w.date) ?? 0) + 1)
  }

  const grid: HeatCell[][] = []
  for (let col = 0; col < weeks; col++) {
    const column: HeatCell[] = []
    for (let row = 0; row < 7; row++) {
      const date = isoDay(addDays(start, col * 7 + row))
      column.push({
        date,
        count: counts.get(date) ?? 0,
        future: date > todayKey,
      })
    }
    grid.push(column)
  }
  return grid
}

export type PatternVolume = { pattern: Pattern; sets: number }

/** Completed sets grouped by movement pattern, sorted high → low. */
export function volumeByPattern(
  workouts: Workout[],
  patternOf: (exerciseId: string) => Pattern | null,
): PatternVolume[] {
  const totals = new Map<Pattern, number>()
  for (const w of workouts) {
    for (const ex of w.exercises) {
      const pattern = patternOf(ex.exerciseId)
      if (!pattern) continue
      const done = ex.sets.filter((s) => s.completed).length
      if (done === 0) continue
      totals.set(pattern, (totals.get(pattern) ?? 0) + done)
    }
  }
  return Array.from(totals.entries())
    .map(([pattern, sets]) => ({ pattern, sets }))
    .sort((a, b) => b.sets - a.sets)
}

export type PrEvent = {
  date: string
  exerciseId: string
  name: string
  metric: Metric
  value: number
}

/** Chronological PR events recorded on completed workouts. */
export function prTimeline(workouts: Workout[]): PrEvent[] {
  const sorted = [...workouts]
    .filter((w) => w.completedAt)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
  const events: PrEvent[] = []
  for (const w of sorted) {
    for (const prId of w.prs) {
      const log = w.exercises.find((e) => e.exerciseId === prId)
      if (!log) continue
      const best = bestSetValue(log.metric, log)
      if (best == null) continue
      events.push({
        date: w.date,
        exerciseId: prId,
        name: log.name,
        metric: log.metric,
        value: best,
      })
    }
  }
  return events
}

export type EffortPoint = { date: string; value: number }

/**
 * Cumulative best-effort curve for one exercise across completed
 * workouts (running maximum), oldest → newest.
 */
export function bestEffortCurve(
  workouts: Workout[],
  exerciseId: string,
  metric: Metric,
): EffortPoint[] {
  const sorted = [...workouts]
    .filter((w) => w.completedAt)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
  const points: EffortPoint[] = []
  let best = 0
  for (const w of sorted) {
    const log = w.exercises.find((e) => e.exerciseId === exerciseId)
    if (!log) continue
    const value = bestSetValue(metric, log)
    if (value == null || value <= best) continue
    best = value
    points.push({ date: w.date, value })
  }
  return points
}

function bestSetValue(
  metric: Metric,
  log: Workout['exercises'][number],
): number | null {
  let best: number | null = null
  for (const s of log.sets) {
    if (!s.completed) continue
    const v =
      metric === 'reps' ? s.reps : metric === 'hold-seconds' ? s.holdSeconds : s.level
    if (v == null) continue
    if (best == null || v > best) best = v
  }
  return best
}

function isoDay(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + days)
  return next
}
