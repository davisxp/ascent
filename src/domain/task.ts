export interface Task {
  id: string
  title: string
  status: 'todo' | 'doing' | 'done'
  due?: string
  notes?: string
  createdAt: string
}
export const TASK_STATUSES = ['todo', 'doing', 'done'] as const