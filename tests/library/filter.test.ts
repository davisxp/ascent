/**
 * Library filter tests — query and pattern matching.
 */

import { describe, expect, it } from 'vitest'
import { filterExercises } from '../../src/features/library/filter'
import { allExercises } from '../../src/content/index'

describe('filterExercises', () => {
  it('returns everything for an empty query and "all"', () => {
    expect(filterExercises(allExercises, '', 'all')).toHaveLength(allExercises.length)
  })

  it('matches by name, case-insensitively', () => {
    const out = filterExercises(allExercises, 'wall push', 'all')
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((e) => e.name.toLowerCase().includes('wall push'))).toBe(true)
  })

  it('matches by target muscle', () => {
    const out = filterExercises(allExercises, 'hamstrings', 'all')
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((e) => e.targetMuscles.some((m) => m.toLowerCase().includes('hamstring')))).toBe(true)
  })

  it('matches by equipment', () => {
    const out = filterExercises(allExercises, 'wall', 'all')
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((e) => e.equipment.includes('wall'))).toBe(true)
  })

  it('filters by pattern', () => {
    const out = filterExercises(allExercises, '', 'push')
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((e) => e.pattern === 'push')).toBe(true)
  })

  it('combines query and pattern', () => {
    const out = filterExercises(allExercises, 'push', 'push')
    expect(out.every((e) => e.pattern === 'push')).toBe(true)
  })

  it('returns nothing for a nonsense query', () => {
    expect(filterExercises(allExercises, 'zzzqqq', 'all')).toHaveLength(0)
  })

  it('includes mobility exercises in the pool', () => {
    const out = filterExercises(allExercises, 'forward fold', 'all')
    expect(out.some((e) => e.id === 'ex-mob-forward-fold')).toBe(true)
  })
})
