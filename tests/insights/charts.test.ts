/**
 * Insights charts tests — heatmap, volume by pattern, PR timeline,
 * best-effort curve.
 */

import { describe, expect, it } from 'vitest'
import { heatmapGrid, volumeByPattern, prTimeline, bestEffortCurve } from '../../src/features/insights/charts'
import { branded } from '../../src/domain/ids'
import type {
  Workout,
  ExerciseLog,
  SetLog,
  ExerciseId,
  WorkoutId,
  SetId,
  Pattern,
  RPE,
} from '../../src/domain/index'

const rpe = (n: number) => branded<RPE>(n)
const setId = (n: string) => branded<SetId>(n)

const set = (reps: number | null, completed = true, rpeN = 5): SetLog => ({
  id: setId(`s-${reps}-${completed}-${rpeN}`),
  exerciseId: branded<ExerciseId>('ex-push-up'),
  reps: reps ?? undefined,
  rpe: rpe(rpeN),
  completed,
  order: 0,
})

const log = (exerciseId: string, metric: ExerciseLog['metric'], sets: SetLog[]): ExerciseLog => ({
  exerciseId: branded<ExerciseId>(exerciseId),
  name: exerciseId,
  metric,
  sets,
})

const workout = (date: string, exercises: ExerciseLog[], prs: string[] = []): Workout => ({
  id: branded<WorkoutId>(`w-${date}`),
  date: branded<never>(date),
  dayIndex: 0,
  weekIndex: 0,
  mesocycleIndex: 0,
  isDeload: false,
  split: 'full-body',
  exercises,
  durationSeconds: 1800,
  completedAt: branded<never>(date),
  xpAwarded: 100,
  prs: prs.map((p) => branded<ExerciseId>(p)),
  why: 'test',
})

describe('heatmapGrid', () => {
  it('aligns columns to Monday-start weeks ending in the current week', () => {
    // 2026-11-15 is a Sunday; the grid's last column is Mon 09 .. Sun 15.
    const grid = heatmapGrid([workout('2026-11-10', [])], 2, new Date('2026-11-15T12:00:00'))
    expect(grid).toHaveLength(2)
    expect(grid[1][6].date).toBe('2026-11-15')
    expect(grid[1][0].date).toBe('2026-11-09')
    expect(grid[0][0].date).toBe('2026-11-02')
    // 2026-11-10 is a Tuesday → last column, row 1.
    expect(grid[1][1]).toMatchObject({ date: '2026-11-10', count: 1, future: false })
    // Future cells inside the trailing week are flagged.
    expect(grid.flat().every((c) => !c.future || c.date > '2026-11-15')).toBe(true)
  })

  it('counts only completed workouts and zero-fills empty days', () => {
    const incomplete: Workout = { ...workout('2026-11-09', []), completedAt: undefined }
    const grid = heatmapGrid(
      [workout('2026-11-09', []), workout('2026-11-09', []), incomplete],
      1,
      new Date('2026-11-15T12:00:00'),
    )
    const monday = grid[0][0]
    expect(monday.count).toBe(2)
    expect(grid[0][2].count).toBe(0)
  })
})

describe('volumeByPattern', () => {
  const patternOf = (id: string): Pattern | null => (id === 'ex-push-up' ? 'push' : id === 'ex-squat' ? 'squat' : null)

  it('sums completed sets per pattern and sorts descending', () => {
    const out = volumeByPattern(
      [
        workout('2026-11-09', [log('ex-push-up', 'reps', [set(10), set(12, false), set(8)])]),
        workout('2026-11-11', [log('ex-squat', 'reps', [set(20)])]),
      ],
      patternOf,
    )
    expect(out).toEqual([
      { pattern: 'push', sets: 2 },
      { pattern: 'squat', sets: 1 },
    ])
  })

  it('skips exercises with no pattern mapping', () => {
    const out = volumeByPattern(
      [workout('2026-11-09', [log('ex-unknown', 'reps', [set(5)])])],
      patternOf,
    )
    expect(out).toEqual([])
  })
})

describe('prTimeline', () => {
  it('emits chronological events with the best set value', () => {
    const events = prTimeline([
      workout(
        '2026-11-12',
        [log('ex-push-up', 'reps', [set(5), set(9), set(7)])],
        ['ex-push-up'],
      ),
      workout(
        '2026-11-08',
        [log('ex-squat', 'reps', [set(15), set(18)])],
        ['ex-squat'],
      ),
    ])
    expect(events.map((e) => e.date)).toEqual(['2026-11-08', '2026-11-12'])
    expect(events[0]).toMatchObject({ name: 'ex-squat', value: 18, metric: 'reps' })
    expect(events[1]).toMatchObject({ name: 'ex-push-up', value: 9 })
  })

  it('ignores PR ids without a matching exercise log', () => {
    const events = prTimeline([workout('2026-11-08', [], ['ex-ghost'])])
    expect(events).toEqual([])
  })
})

describe('bestEffortCurve', () => {
  it('returns a running maximum, oldest to newest', () => {
    const curve = bestEffortCurve(
      [
        workout('2026-11-12', [log('ex-push-up', 'reps', [set(6)])]),
        workout('2026-11-08', [log('ex-push-up', 'reps', [set(4)])]),
        workout('2026-11-10', [log('ex-push-up', 'reps', [set(10)])]),
        workout('2026-11-14', [log('ex-push-up', 'reps', [set(8)])]), // below max, dropped
      ],
      'ex-push-up',
      'reps',
    )
    expect(curve).toEqual([
      { date: '2026-11-08', value: 4 },
      { date: '2026-11-10', value: 10 },
    ])
  })
})
