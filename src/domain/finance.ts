/**
 * Finance domain types.
 * Mirrors the Finances sheet of Full_Lifestyle.xlsm and the Compendium
 * "The Ledger" section: salary to net, monthly budget, savings plan and
 * debt tracker. Pure data — calculations live in src/engine/finance.ts.
 */

export interface BudgetLine {
  id: string
  name: string
  amount: number
}

export interface LoanDebt {
  id: string
  name: string
  balance: number
  apr: number
  /** Opening balance, used for the "grown by" history hint. */
  initial?: number
  /** Fixed monthly repayment; the student loan uses its 9% deduction. */
  pay?: number
}

export interface CardDebt {
  id: string
  name: string
  balance: number
  limit: number
  apr: number
}

export interface InformalDebt {
  id: string
  name: string
  balance: number
  rate: number
}

export interface FinanceRates {
  tax: number
  higherTax: number
  higherThreshold: number
  ni: number
  pension: number
  loan: number
  loanThreshold: number
}

export interface BonusMonth {
  id: string
  label: string
  amount: number
}

export interface BonusLog {
  label: string
  months: BonusMonth[]
}

export interface FinancePlan {
  /** Workbook review date (the "Date" cell on the Investments sheet). */
  asOf: string
  gross: number
  taxFree: number
  rates: FinanceRates
  bills: BudgetLine[]
  regular: BudgetLine[]
  savings: BudgetLine[]
  loans: LoanDebt[]
  cards: CardDebt[]
  informal: InformalDebt[]
  bonusFY1: BonusLog
}
