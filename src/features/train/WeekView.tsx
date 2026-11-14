import { useEffect, useState } from 'react'
import { Card } from '../../ui/primitives'
import { DayPlanRepositoryImpl } from '../../data/repositories'
import type { DayPlan } from '../../domain/index'

const dayPlanRepo = new DayPlanRepositoryImpl()

export const Train = () => {
  const [plans, setPlans] = useState<DayPlan[]>([])

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    dayPlanRepo.getWeek(today).then(setPlans).catch(() => {})
  }, [])

  return (
    <div className="p-6 pb-24 md:pb-6">
      <h1 className="font-display text-3xl font-bold mb-4">Train</h1>
      {plans.length === 0 ? (
        <Card>
          <p className="text-sm text-ink/50">No plan generated yet. Generate a week to begin.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {plans.map((p) => (
            <Card key={p.date}>
              <h3 className="font-display text-base mb-1">{p.date} — {p.split}</h3>
              <p className="text-xs text-ink/50">{p.exercises.length} exercises</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
