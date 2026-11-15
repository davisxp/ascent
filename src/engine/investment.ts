/**
 * Investment engine — pure calculations that mirror Full_Lifestyle.xlsm
 * (Investments sheet) and the Compendium "The Portfolio" live formulas.
 */

import type { AccountKey, InvestmentPlan } from '../domain/investment'

export interface AccountTotals {
  key: AccountKey
  name: string
  role?: string
  value: number
  invested: number
  gain: number
  pct: number
  monthly: number
  annual: number
  annualised: number
  alpha: number
  allowanceTotal: number | null
  allowanceLeft: number | null
}

export interface InvestmentTotals {
  accounts: Record<AccountKey, AccountTotals>
  nav: number
  investedSum: number
  gain: number
  pct: number
  pensionSum: number
  accessible: number
  isaLeft: number
  lisaLeft: number
  sippLeft: number
  emergencyTarget: number
  potMonthly: number
}

const yearsBetween = (from: string, to: string): number => {
  const start = new Date(`${from}T00:00:00`).getTime()
  const end = new Date(`${to}T00:00:00`).getTime()
  return Math.max(0.25, (end - start) / 365.25 / 86400000)
}

/** Value, gain, annualised return and allowance headroom per wrapper. */
export function computeInvestments(plan: InvestmentPlan, monthlyNonSavings: number): InvestmentTotals {
  const accounts = {} as Record<AccountKey, AccountTotals>

  for (const account of plan.accounts) {
    const value = Number(account.value) || 0
    const invested = Number(account.invested) || 0
    const monthly = Number(account.monthly) || 0
    const annual = monthly * 12
    const gain = value - invested
    const pct = invested !== 0 ? gain / invested : 0
    const years = yearsBetween(account.start, plan.asOf)
    const annualised = invested !== 0 ? pct / years : 0

    accounts[account.key] = {
      key: account.key,
      name: account.name,
      role: account.role,
      value,
      invested,
      gain,
      pct,
      monthly,
      annual,
      annualised,
      alpha: invested !== 0 ? annualised - plan.benchmark.value : 0,
      allowanceTotal: account.allowanceTotal,
      allowanceLeft:
        account.allowanceTotal === null ? null : account.allowanceTotal - annual,
    }
  }

  const nav = accounts.isa.value + accounts.lisa.value + accounts.sipp.value
  const investedSum = accounts.isa.invested + accounts.lisa.invested + accounts.sipp.invested
  const gain = nav - investedSum

  // The LISA is funded out of the same £20k ISA allowance (workbook M4 =
  // 20000 - K5 - K4), so the ISA row must show the combined headroom.
  if (accounts.isa.allowanceTotal !== null) {
    accounts.isa.allowanceLeft =
      accounts.isa.allowanceTotal - accounts.isa.annual - accounts.lisa.annual
  }

  return {
    accounts,
    nav,
    investedSum,
    gain,
    pct: investedSum !== 0 ? gain / investedSum : 0,
    pensionSum: accounts.sipp.value + accounts.company.value,
    accessible: accounts.isa.value + accounts.gia.value,
    isaLeft: accounts.isa.allowanceLeft ?? 0,
    lisaLeft: accounts.lisa.allowanceLeft ?? 0,
    sippLeft: accounts.sipp.allowanceLeft ?? 0,
    emergencyTarget: monthlyNonSavings * plan.emergencyMonths,
    potMonthly: accounts.gia.monthly,
  }
}

export interface PortfolioProjection {
  futureValue: number
  contributions: number
}

/** Compound projection, monthly contributions at the end of each month. */
export function projectPortfolio(
  nav: number,
  years: number,
  annualRatePct: number,
  monthly: number,
): PortfolioProjection {
  const rate = annualRatePct / 100 / 12
  const months = Math.max(0, Math.round(years * 12))
  const growth = Math.pow(1 + rate, months)
  const futureValue =
    nav * growth + (rate > 0 ? monthly * ((growth - 1) / rate) : monthly * months)
  return { futureValue, contributions: monthly * months }
}

export const allocationTotal = (slices: { p: number }[]): number =>
  slices.reduce((total, slice) => total + (Number(slice.p) || 0), 0)
