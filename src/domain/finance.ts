export interface FinanceEntry {
  id: string
  name: string
  amount: number
  kind: 'income' | 'expense'
  date: string
  notes?: string
}