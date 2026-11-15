import { describe, expect, it } from 'vitest'
import { financeSeed } from '../../src/content/financePlan'
import { investmentSeed } from '../../src/content/investmentPlan'
import { computeFinance } from '../../src/engine/finance'
import {
  allocationTotal,
  computeInvestments,
  projectPortfolio,
} from '../../src/engine/investment'

const nonSavings = computeFinance(financeSeed).nonSavings

describe('computeInvestments (Full_Lifestyle Investments sheet)', () => {
  const totals = computeInvestments(investmentSeed, nonSavings)

  it('mirrors NAV and capital invested', () => {
    expect(totals.nav).toBeCloseTo(6074.82, 2)
    expect(totals.investedSum).toBeCloseTo(4275, 2)
    expect(totals.gain).toBeCloseTo(1799.82, 2)
    expect(totals.pct).toBeCloseTo(0.42101, 4)
  })

  it('derives pension sum and accessible NAV', () => {
    expect(totals.pensionSum).toBeCloseTo(5447, 2)
    expect(totals.accessible).toBe(0)
  })

  it('computes allowance headroom after the monthly plan', () => {
    // ISA headroom shares the £20k cap with the LISA (workbook M4 = 20000 - K5 - K4).
    expect(totals.accounts.isa.allowanceLeft).toBeCloseTo(11540, 2)
    expect(totals.isaLeft).toBeCloseTo(11540, 2)
    expect(totals.lisaLeft).toBeCloseTo(40, 2)
    expect(totals.sippLeft).toBeCloseTo(60000, 2)
  })

  it('matches the workbook annualised gain and alpha', () => {
    expect(totals.accounts.lisa.annualised).toBeCloseTo(0.058, 3)
    expect(totals.accounts.sipp.annualised).toBeCloseTo(0.1004, 3)
    expect(totals.accounts.lisa.alpha).toBeCloseTo(0.058 - 0.074, 3)
    expect(totals.accounts.sipp.alpha).toBeCloseTo(0.1004 - 0.074, 3)
  })

  it('sizes the emergency fund from non-savings spend', () => {
    expect(totals.emergencyTarget).toBeCloseTo(4164, 2)
    expect(totals.potMonthly).toBeCloseTo(350, 2)
  })

  it('has fully allocated pots and targets', () => {
    expect(allocationTotal(investmentSeed.pots)).toBeCloseTo(1, 6)
    expect(allocationTotal(investmentSeed.isaTarget)).toBeCloseTo(1, 6)
    expect(allocationTotal(investmentSeed.lisaTarget)).toBeCloseTo(1, 6)
    expect(allocationTotal(investmentSeed.sippTarget)).toBeCloseTo(1, 6)
  })
})

describe('projectPortfolio', () => {
  it('adds contributions with no return', () => {
    expect(projectPortfolio(1000, 1, 0, 100).futureValue).toBeCloseTo(2200, 6)
  })

  it('compounds the starting balance', () => {
    const projection = projectPortfolio(1000, 10, 7, 0)
    expect(projection.futureValue).toBeCloseTo(1000 * Math.pow(1 + 0.07 / 12, 120), 4)
    expect(projection.contributions).toBe(0)
  })
})
