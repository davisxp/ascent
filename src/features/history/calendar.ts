/**
 * History calendar — pure month-grid helpers (Mon-start weeks).
 */

/** ISO date key (YYYY-MM-DD) or null for out-of-month cells. */
export type CalendarCell = string | null

/**
 * Weeks of a month, Monday-start. month is 0-based.
 * Leading/trailing nulls pad the first and last weeks.
 */
export function monthGrid(year: number, month: number): CalendarCell[][] {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leading = (first.getDay() + 6) % 7 // 0 = Monday

  const cells: CalendarCell[] = []
  for (let i = 0; i < leading; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(isoDay(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)

  const grid: CalendarCell[][] = []
  for (let i = 0; i < cells.length; i += 7) grid.push(cells.slice(i, i + 7))
  return grid
}

/** Human title, e.g. "November 2026". */
export function monthTitle(year: number, month: number): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(year, month, 1),
  )
}

/** Shift a (year, month) pair by ±n months. */
export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const total = year * 12 + month + delta
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 }
}

function isoDay(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}
