/**
 * Library filtering — pure text/pattern matching over exercise data.
 */

import type { Exercise } from '../../domain/index'

export type PatternFilter = 'all' | string

function matchesQuery(exercise: Exercise, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (q === '') return true
  return (
    exercise.name.toLowerCase().includes(q) ||
    exercise.pattern.toLowerCase().includes(q) ||
    exercise.targetMuscles.some((m) => m.toLowerCase().includes(q)) ||
    exercise.equipment.some((eq) => eq.toLowerCase().includes(q)) ||
    (exercise.chainId ?? '').toLowerCase().includes(q)
  )
}

export function filterExercises(
  exercises: Exercise[],
  query: string,
  pattern: PatternFilter,
): Exercise[] {
  return exercises.filter(
    (ex) => (pattern === 'all' || ex.pattern === pattern) && matchesQuery(ex, query),
  )
}
