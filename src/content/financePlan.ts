/**
 * Seed finance plan — transcribed from Full_Lifestyle.xlsm (Finances sheet)
 * and the Compendium's finances block (asOf 2026-09-05).
 * Values are editable in the app; this is only the first-run snapshot.
 */

import type { FinancePlan } from '../domain/finance'

const month = (label: string, index: number) => ({
  id: `bonus-${index + 1}`,
  label,
  amount: 0,
})

export const financeSeed: FinancePlan = {
  asOf: '2026-09-05',
  gross: 40000,
  taxFree: 12570,
  rates: {
    tax: 0.2,
    higherTax: 0.4,
    higherThreshold: 50270,
    ni: 0.08,
    pension: 0.05,
    loan: 0.09,
    loanThreshold: 29385,
  },
  bills: [
    { id: 'bill-rail', name: 'Rail Pass', amount: 500 },
    { id: 'bill-rent', name: 'Rent', amount: 500 },
    { id: 'bill-gym', name: 'Gym', amount: 20 },
    { id: 'bill-reading', name: 'Reading', amount: 8 },
  ],
  regular: [
    { id: 'reg-misc', name: 'Misc Daily Budgeting', amount: 300 },
    { id: 'reg-self', name: 'Self Improvement', amount: 60 },
  ],
  savings: [
    { id: 'save-gia', name: 'GIA / Cash Savings', amount: 350 },
    { id: 'save-isa', name: 'ISA Savings', amount: 375 },
    { id: 'save-lisa', name: 'LISA Savings', amount: 330 },
  ],
  loans: [
    {
      id: 'loan-student',
      name: 'Student Loan',
      balance: 64272.58,
      apr: 0.06,
      initial: 62423.49,
    },
  ],
  cards: [
    { id: 'card-hsbc', name: 'HSBC — Classic', balance: 0, limit: 500, apr: 0.299 },
    { id: 'card-amex', name: 'Amex Gold', balance: 0, limit: 10000, apr: 0.291 },
  ],
  informal: [{ id: 'debt-ious', name: 'IOUs', balance: 0, rate: 0 }],
  bonusFY1: {
    label: 'Bonus Log FY1 (Sep 2026 – Aug 2027)',
    months: [
      month('Sep 2026', 0),
      month('Oct 2026', 1),
      month('Nov 2026', 2),
      month('Dec 2026', 3),
      month('Jan 2027', 4),
      month('Feb 2027', 5),
      month('Mar 2027', 6),
      month('Apr 2027', 7),
      month('May 2027', 8),
      month('Jun 2027', 9),
      month('Jul 2027', 10),
      month('Aug 2027', 11),
    ],
  },
}
