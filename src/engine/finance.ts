/**
 * Finance engine — pure calculations that mirror Full_Lifestyle.xlsm
 * (Finances sheet) and the Compendium "The Ledger" live formulas.
 */

import type { FinancePlan, LoanDebt } from '../domain/finance'

export interface FinanceTotals {
  gross: number
  pension: number
  taxable: number
  tax: number
  ni: number
  loan: number
  annualNet: number
  monthlyNet: number
  bills: number
  regular: number
  savings: number
  outgoings: number
  nonSavings: number
  yearlyLiving: number
  yearlySavings: number
  unbudgeted: number
  debtsTotal: number
  savingsPlan: { id: string; name: string; annual: number }[]
}

const sumLines = (lines: { amount: number }[]): number =>
  lines.reduce((total, line) => total + (Number.isFinite(line.amount) ? line.amount : 0), 0)

/** Salary to net, monthly budget and debt totals. */
export function computeFinance(plan: FinancePlan): FinanceTotals {
  const gross = plan.gross
  const pension = gross * plan.rates.pension
  const taxable = Math.max(0, gross - plan.taxFree - pension)

  const basicBand = Math.max(0, plan.rates.higherThreshold - plan.taxFree)
  const tax =
    taxable <= basicBand
      ? taxable * plan.rates.tax
      : basicBand * plan.rates.tax + (taxable - basicBand) * plan.rates.higherTax

  const ni = taxable * plan.rates.ni
  const loan = Math.max(0, gross - plan.rates.loanThreshold) * plan.rates.loan
  const annualNet = gross - tax - ni - pension - loan

  const bills = sumLines(plan.bills)
  const regular = sumLines(plan.regular)
  const savings = sumLines(plan.savings)
  const outgoings = bills + regular + savings
  const monthlyNet = annualNet / 12

  const debtsTotal =
    plan.loans.reduce((total, l) => total + (Number(l.balance) || 0), 0) +
    plan.cards.reduce((total, c) => total + (Number(c.balance) || 0), 0) +
    plan.informal.reduce((total, d) => total + (Number(d.balance) || 0), 0)

  return {
    gross,
    pension,
    taxable,
    tax,
    ni,
    loan,
    annualNet,
    monthlyNet,
    bills,
    regular,
    savings,
    outgoings,
    nonSavings: bills + regular,
    yearlyLiving: (bills + regular) * 12,
    yearlySavings: savings * 12,
    unbudgeted: monthlyNet - outgoings,
    debtsTotal,
    savingsPlan: plan.savings.map((line) => ({
      id: line.id,
      name: line.name,
      annual: line.amount * 12,
    })),
  }
}

export interface LoanProjection {
  /** True when the payment clears the balance inside the 100-year guard. */
  cleared: boolean
  years: number
  months: number
  payment: number
  interest: number
  /** Extra per month needed just to stop the balance growing. */
  breakevenExtra: number
  /** Balance change over the next year when the payment never clears it. */
  growth12: number
}

/**
 * Loan pay-down projection. `basePayment` is the monthly repayment before
 * any overpayment (the student loan uses its monthly net deduction).
 */
export function projectLoan(
  loan: LoanDebt,
  extraMonthly: number,
  basePayment: number,
): LoanProjection {
  const balance = Number(loan.balance) || 0
  const monthlyRate = (Number(loan.apr) || 0) / 12
  const payment = (Number(basePayment) || 0) + (Number(extraMonthly) || 0)
  const breakevenExtra = Math.max(0, balance * monthlyRate - basePayment)

  if (balance <= 0) {
    return {
      cleared: true,
      years: 0,
      months: 0,
      payment,
      interest: 0,
      breakevenExtra: 0,
      growth12: 0,
    }
  }

  if (payment <= balance * monthlyRate) {
    let projected = balance
    for (let month = 0; month < 12; month += 1) {
      projected = projected * (1 + monthlyRate) - payment
    }
    return {
      cleared: false,
      years: 0,
      months: 0,
      payment,
      interest: 0,
      breakevenExtra,
      growth12: projected - balance,
    }
  }

  let remaining = balance
  let months = 0
  let interest = 0
  while (remaining > 0 && months < 1200) {
    const charged = remaining * monthlyRate
    interest += charged
    remaining = remaining + charged - payment
    months += 1
  }

  return {
    cleared: remaining <= 0,
    years: Math.floor(months / 12),
    months: months % 12,
    payment,
    interest,
    breakevenExtra,
    growth12: 0,
  }
}

/** UK tax year ends on 5 April. */
export function taxYearEnd(asOf: string): Date {
  const date = new Date(`${asOf}T00:00:00`)
  const end = new Date(date.getFullYear(), 3, 5)
  if (date.getTime() > end.getTime()) return new Date(date.getFullYear() + 1, 3, 5)
  return end
}

/** The same 5 April as a local ISO date (no timezone shift). */
export function taxYearEndISO(asOf: string): string {
  const end = taxYearEnd(asOf)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`
}

export function daysUntilTaxYearEnd(asOf: string): number {
  const date = new Date(`${asOf}T00:00:00`)
  return Math.round((taxYearEnd(asOf).getTime() - date.getTime()) / 86400000)
}

export const bonusTotal = (plan: FinancePlan): number =>
  plan.bonusFY1.months.reduce((total, month) => total + (Number(month.amount) || 0), 0)
