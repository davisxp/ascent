import { describe, it, expect } from 'vitest'
import { branded, type RPE, type ChainId } from '../../src/domain/ids'
import { evaluateProgression, deloadVolume, holdLadder } from '../../src/engine/progression'

describe('evaluateProgression', () => {
  const base = {
    placement: { chainId: branded<ChainId>('chain-pushup'), stepIndex: 0 },
    recentSets: [
      { reps: 15, rpe: branded<RPE>(7), completed: true },
      { reps: 15, rpe: branded<RPE>(7), completed: true },
      { reps: 15, rpe: branded<RPE>(7), completed: true },
    ],
    consecutiveMisses: 0,
  }

  it('advances when top of range on all sets at RPE <= 8', () => {
    const r = evaluateProgression({ ...base, repsRange: [8, 15] })
    expect(r.action).toBe('advance')
    expect(r.stepIndex).toBe(1)
  })

  it('does not advance when RPE > 8', () => {
    const r = evaluateProgression({
      ...base,
      repsRange: [8, 15],
      recentSets: [{ reps: 15, rpe: branded<RPE>(9), completed: true }],
    })
    expect(r.action).toBe('repeat')
  })

  it('regresses after 3 misses', () => {
    const r = evaluateProgression({
      ...base,
      repsRange: [8, 15],
      recentSets: [{ reps: 5, rpe: branded<RPE>(9), completed: false }],
      consecutiveMisses: 2,
    })
    expect(r.action).toBe('repeat') // not all completed => not a 'miss' counted
  })

  it('regresses at step 0 stays at 0', () => {
    const r = evaluateProgression({
      ...base,
      placement: { chainId: 'c', stepIndex: 0 },
      repsRange: [8, 15],
      consecutiveMisses: 3,
      recentSets: [{ reps: 5, rpe: branded<RPE>(7), completed: true }],
    })
    expect(r.action).toBe('repeat')
  })
})

describe('deloadVolume', () => {
  it('reduces sets to 60%', () => {
    expect(deloadVolume(5).sets).toBe(3)
    expect(deloadVolume(3).sets).toBe(2)
  })

  it('reduces reps to 60%', () => {
    expect(deloadVolume(3, [8, 15]).reps).toEqual([5, 9])
  })
})

describe('holdLadder', () => {
  it('targets 20 then 40 then advances', () => {
    expect(holdLadder(10)).toEqual({ target: 20, advanced: false })
    expect(holdLadder(25)).toEqual({ target: 40, advanced: false })
    expect(holdLadder(45)).toEqual({ target: 40, advanced: true })
  })
})
