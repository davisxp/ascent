/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { WorkoutRepositoryImpl } from '../../data/repositories'
import data from '../../content/compendium.json'

const repo = new WorkoutRepositoryImpl()

export function Workouts() {
  const c = data as any
  const [workouts, setWorkouts] = useState<any[]>([])
  const load = async () => setWorkouts(await repo.getAll())
  useEffect(() => { load() }, [])

  return (
    <div className="p-6 space-y-4 text-ink">
      <h1 className="font-display text-2xl">Workouts</h1>
      <p className="text-sm text-ink-soft">Saved workouts: {workouts.length}</p>
      <pre className="text-xs whitespace-pre-wrap bg-white border rounded p-4">{JSON.stringify(c.workouts ?? {}, null, 2).slice(0, 2000)}</pre>
    </div>
  )
}