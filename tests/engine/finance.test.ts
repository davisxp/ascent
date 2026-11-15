import { describe, expect, it } from 'vitest'
import { financeSeed } from '../../src/content/financePlan'
import {
  bonusTotal,
  computeFinance,
  daysUntilTaxYearEnd,
  projectLoan,
  taxYearEndISO,
} from '../../src/engine/finance'

describe('computeFinance (Full_Lifestyle Finances sheet)', () => {
  const totals = computeFinance(financeSeed)

  it('derives taxable income, tax, NI and the student loan', () => {
    expect(totals.pension).toBeCloseTo(2000, 2)
    expect(totals.taxable).toBeCloseTo(25430, 2)
    expect(totals.tax).toBeCloseTo(5086, 2)
    expect(totals.ni).toBeCloseTo(2034.4, 2)
    expect(totals.loan).toBeCloseTo(955.35, 2)
  })

  it('reaches the same annual and monthly net as the workbook', () => {
    expect(totals.annualNet).toBeCloseTo(29924.25, 2)
    expect(totals.monthlyNet).toBeCloseTo(2493.6875, 4)
  })

  it('matches the budget totals', () => {
    expect(totals.bills).toBeCloseTo(1028, 2)
    expect(totals.regular).toBeCloseTo(360, 2)
    expect(totals.savings).toBeCloseTo(1055, 2)
    expect(totals.outgoings).toBeCloseTo(2443, 2)
    expect(totals.nonSavings).toBeCloseTo(1388, 2)
    expect(totals.yearlyLiving).toBeCloseTo(16656, 2)
    expect(totals.yearlySavings).toBeCloseTo(12660, 2)
    expect(totals.unbudgeted).toBeCloseTo(50.6875, 4)
    expect(totals.debtsTotal).toBeCloseTo(64272.58, 2)
  })

  it('lists the yearly savings plan', () => {
    expect(totals.savingsPlan.map((line) => line.annual)).toEqual([4200, 4500, 3960])
  })

  it('sums the FY1 bonus log', () => {
    expect(bonusTotal(financeSeed)).toBe(0)
  })
})

describe('projectLoan', () => {
  const loan = financeSeed.loans[0]

  it('reports a loan that never clears under the 9% deduction alone', () => {
    const projection = projectLoan(loan, 0, 955.35 / 12)
    expect(projection.cleared).toBe(false)
    expect(projection.breakevenExtra).toBeGreaterThan(0)
    expect(projection.growth12).toBeGreaterThan(0)
  })

  it('clears a loan once the overpayment covers the interest', () => {
    const projection = projectLoan(loan, 600, 955.35 / 12)
    expect(projection.cleared).toBe(true)
    expect(projection.interest).toBeGreaterThan(0)
  })
})

describe('UK tax year helpers', () => {
  it('finds the next 5 April', () => {
    expect(taxYearEndISO('2026-09-05')).toBe('2027-04-05')
    expect(taxYearEndISO('2026-02-01')).toBe('2026-04-05')
  })

  it('counts the days left in the allowance year', () => {
    expect(daysUntilTaxYearEnd('2026-09-05')).toBe(212)
  })
})
