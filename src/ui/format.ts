/**
 * Formatting helpers for money, percentages and dates.
 * Presentation only — no feature logic.
 */

const decimal = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const whole = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** £1,234.56 (negative keeps the minus in front of the symbol). */
export const money = (value: number): string => {
  const safe = Number.isFinite(value) ? value : 0
  return `${safe < 0 ? '-' : ''}£${decimal.format(Math.abs(safe))}`
}

/** £1,235 — the ledger's rounded variant. */
export const money0 = (value: number): string => {
  const safe = Number.isFinite(value) ? value : 0
  return `${safe < 0 ? '-' : ''}£${whole.format(Math.abs(safe))}`
}

/** 12.3% from a 0.123 ratio. */
export const percent = (ratio: number, decimals = 1): string =>
  `${((Number.isFinite(ratio) ? ratio : 0) * 100).toFixed(decimals)}%`

/** 12.3% from a percentage number (7.4 → 7.4%). */
export const percentValue = (value: number, decimals = 1): string =>
  `${(Number.isFinite(value) ? value : 0).toFixed(decimals)}%`

/** 12.345 → 12.35: the value a percentage input should show. */
export const percentInput = (ratio: number): number =>
  Number(((Number.isFinite(ratio) ? ratio : 0) * 100).toFixed(2))

export const signedMoney = (value: number): string => `${value >= 0 ? '+' : ''}${money(value)}`

export const signedPercent = (ratio: number, decimals = 1): string =>
  `${ratio >= 0 ? '+' : ''}${percent(ratio, decimals)}`

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

export const formatDateMed = (iso: string): string => {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Today as a local ISO date (YYYY-MM-DD), never UTC-shifted. */
export const todayISO = (): string => {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
