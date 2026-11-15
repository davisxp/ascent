export interface GroomingRoutine {
  id: string
  title: string
  period: 'am' | 'pm'
  steps: string[]
}