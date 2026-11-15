/**
 * Seed investment plan — transcribed from Full_Lifestyle.xlsm (Investments
 * sheet) and the Compendium's investments block. The workbook's live
 * STOCKHISTORY benchmark is a network formula, so its cached value is
 * stored here and stays editable in the app.
 */

import type { InvestmentPlan } from '../domain/investment'

export const investmentSeed: InvestmentPlan = {
  asOf: '2026-09-05',
  accounts: [
    {
      key: 'isa',
      name: 'ISA',
      value: 0,
      invested: 0,
      monthly: 375,
      allowanceTotal: 20000,
      start: '2026-10-01',
    },
    {
      key: 'lisa',
      name: 'LISA',
      role: 'House Deposit',
      value: 627.82,
      invested: 500,
      monthly: 330,
      allowanceTotal: 4000,
      start: '2022-04-08',
    },
    {
      key: 'sipp',
      name: 'SIPP',
      role: 'Pension',
      value: 5447,
      invested: 3775,
      monthly: 0,
      allowanceTotal: 60000,
      start: '2022-04-08',
    },
    {
      key: 'company',
      name: 'Company Pension',
      role: 'Pension',
      value: 0,
      invested: 0,
      monthly: 300,
      allowanceTotal: null,
      start: '2026-10-01',
    },
    {
      key: 'gia',
      name: 'GIA / Cash',
      value: 0,
      invested: 0,
      monthly: 350,
      allowanceTotal: null,
      start: '2026-10-01',
    },
  ],
  isaTarget: [
    { cls: 'Stock', name: 'FTSE All-World', ticker: 'VWRP', p: 0.55 },
    { cls: 'Stock', name: 'Global Quality', ticker: 'GGRG', p: 0.15 },
    { cls: 'Bond', name: 'Global Aggregate', ticker: 'VAGS', p: 0.15 },
    { cls: 'Bond', name: 'Corporate', ticker: 'VGPA', p: 0.05 },
    { cls: 'Commodity', name: 'Physical Gold', ticker: 'SGLN', p: 0.1 },
  ],
  lisaTarget: [
    { cls: 'Stock', name: 'UK Mid Cap', p: 0.18 },
    { cls: 'Stock', name: 'UK Growth', p: 0.4 },
    { cls: 'Bond', name: 'US Smaller', p: 0.18 },
    { cls: 'Blended', name: 'Real Return', p: 0.24 },
  ],
  sippTarget: [{ cls: 'Stock', name: 'Multi-Adventurous', p: 1 }],
  pots: [
    { id: 'pot-birthday', name: 'Birthday / Christmas', p: 0.07 },
    { id: 'pot-er', name: 'ER', p: 0.11 },
    { id: 'pot-holidays', name: 'Holidays', p: 0.62 },
    { id: 'pot-l', name: 'L', p: 0.1 },
    { id: 'pot-treats', name: 'Personal Treats', p: 0.1 },
  ],
  pensionRates: { personal: 0.05, company: 0.04 },
  emergencyMonths: 3,
  benchmark: {
    label: '5-Year Annualised All-World (VT)',
    value: 0.074,
    asOf: '2026-11-15',
  },
}
