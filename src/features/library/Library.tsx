import { useEffect, useState } from 'react'
import { Card } from '../../ui/primitives'
import { ExerciseRepositoryImpl } from '../../data/repositories'
import type { Exercise } from '../../domain/index'

const exRepo = new ExerciseRepositoryImpl()

export const Library = () => {
  const [exercises, setExercises] = useState<Exercise[]>([])

  useEffect(() => {
    exRepo.getAll().then(setExercises).catch(() => {})
  }, [])

  return (
    <div className="p-6 pb-24 md:pb-6">
      <h1 className="font-display text-3xl font-bold mb-4">Library</h1>
      <Card>
        <p className="text-sm text-ink/50 mb-2">{exercises.length} exercises available.</p>
        <ul className="space-y-1 max-h-96 overflow-y-auto">
          {exercises.slice(0, 50).map((e) => (
            <li key={e.id} className="text-sm">
              {e.name} — {e.pattern} (diff {e.difficulty})
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
