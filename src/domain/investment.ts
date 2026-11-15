/**
 * Investment domain types.
 * Mirrors the Investments sheet of Full_Lifestyle.xlsm and the Compendium
 * "The Portfolio" section: five wrappers, target allocations, GIA pots,
 * pension rates, emergency fund and benchmark.
 */

export type AccountKey = 'isa' | 'lisa' | 'sipp' | 'company' | 'gia'

export interface InvestmentAccount {
  key: AccountKey
  name: string
  role?: string
  value: number
  invested: number
  monthly: number
  /** Annual allowance cap; null when the wrapper has no allowance. */
  allowanceTotal: number | null
  start: string
}

export interface AllocationSlice {
  cls: string
  name: string
  ticker?: string
  p: number
}

export interface GiaPot {
  id: string
  name: string
  p: number
}

export interface InvestmentPlan {
  asOf: string
  accounts: InvestmentAccount[]
  isaTarget: AllocationSlice[]
  lisaTarget: AllocationSlice[]
  sippTarget: AllocationSlice[]
  pots: GiaPot[]
  pensionRates: { personal: number; company: number }
  emergencyMonths: number
  benchmark: { label: string; value: number; asOf: string }
}
