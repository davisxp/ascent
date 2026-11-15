/**
 * History calendar tests — month grids, titles, month shifting.
 */

import { describe, expect, it } from 'vitest'
import { monthGrid, monthTitle, shiftMonth } from '../../src/features/history/calendar'

describe('monthGrid', () => {
  it('pads the leading gap and returns Monday-start weeks', () => {
    // November 2026 starts on a Sunday → 6 leading nulls (Mon..Sat pad).
    const grid = monthGrid(2026, 10)
    expect(grid[0]).toEqual([null, null, null, null, null, null, '2026-11-01'])
    expect(grid[1][0]).toBe('2026-11-02')
    expect(grid.flat().filter(Boolean)).toHaveLength(30)
  })

  it('covers full weeks exactly for a month starting on Monday', () => {
    // February 2021 starts on a Monday with 28 days = exactly 4 weeks.
    const grid = monthGrid(2021, 1)
    expect(grid[0][0]).toBe('2021-02-01')
    expect(grid).toHaveLength(4)
    expect(grid.flat().every((c) => c !== null)).toBe(true)
  })

  it('handles leap February', () => {
    const grid = monthGrid(2028, 1)
    expect(grid.flat().filter(Boolean)).toHaveLength(29)
  })
})

describe('monthTitle', () => {
  it('formats as "Month Year"', () => {
    expect(monthTitle(2026, 10)).toBe('November 2026')
    expect(monthTitle(2027, 0)).toBe('January 2027')
  })
})

describe('shiftMonth', () => {
  it('moves across year boundaries in both directions', () => {
    expect(shiftMonth(2026, 10, 1)).toEqual({ year: 2026, month: 11 })
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 })
    expect(shiftMonth(2027, 0, -1)).toEqual({ year: 2026, month: 11 })
    expect(shiftMonth(2026, 5, 12)).toEqual({ year: 2027, month: 5 })
  })
})
