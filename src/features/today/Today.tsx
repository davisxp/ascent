import { useEffect, useState } from 'react'
import { Card } from '../../ui/primitives'
import { WorkoutRepositoryImpl } from '../../data/repositories'
import type { Workout } from '../../domain/index'

const workoutRepo = new WorkoutRepositoryImpl()

export const Today = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([])

  useEffect(() => {
    workoutRepo.getAll().then(setWorkouts).catch(() => {})
  }, [])

  return (
    <div className="p-6 pb-24 md:pb-6">
      <h1 className="font-display text-3xl font-bold mb-4">Today</h1>
      <Card className="mb-4">
        <p className="text-sm text-ink/60">Welcome to ASCENT. Your training journal.</p>
      </Card>
      <Card>
        <h2 className="font-display text-lg mb-2">Recent workouts</h2>
        {workouts.length === 0 ? (
          <p className="text-sm text-ink/50">No workouts yet. Start your first session.</p>
        ) : (
          <ul className="space-y-2">
            {workouts.slice(0, 5).map((w) => (
              <li key={w.id} className="text-sm">
                {w.date} — {w.split} ({w.exercises.length} exercises)
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
