import { describe, it, expect } from 'vitest'
import {
  levelForXP,
  rankForLevel,
  levelInfo,
  isPR,
  updateStreak,
  xpFor,
} from '../../src/engine/gamification'

describe('gamification', () => {
  it('XP values', () => {
    expect(xpFor({ type: 'set', amount: 5 })).toBe(5)
    expect(xpFor({ type: 'workout', amount: 50 })).toBe(50)
    expect(xpFor({ type: 'pr', amount: 40 })).toBe(40)
    expect(xpFor({ type: 'flexibility', amount: 60 })).toBe(60)
    expect(xpFor({ type: 'skill', amount: 150 })).toBe(150)
  })

  it('level = 1 + floor(xp/1000)', () => {
    expect(levelForXP(0).level).toBe(1)
    expect(levelForXP(999).level).toBe(1)
    expect(levelForXP(1000).level).toBe(2)
    expect(levelForXP(2500).level).toBe(3)
  })

  it('xpToNext', () => {
    expect(levelForXP(1500).xpToNext).toBe(500)
  })

  it('rank for level', () => {
    expect(rankForLevel(1)).toBe('Recruit')
    expect(rankForLevel(10)).toBe('Field Marshal')
    expect(rankForLevel(100)).toBe('Field Marshal')
  })

  it('levelInfo', () => {
    const li = levelInfo(3200)
    expect(li.level).toBe(4)
    expect(li.xp).toBe(3200)
    expect(li.xpToNext).toBe(800)
  })

  it('isPR reps', () => {
    expect(isPR('reps', { reps: 15 }, { reps: 12 })).toBe(true)
    expect(isPR('reps', { reps: 12 }, { reps: 15 })).toBe(false)
    expect(isPR('reps', { reps: 15 }, null)).toBe(true)
  })

  it('isPR hold-seconds', () => {
    expect(isPR('hold-seconds', { holdSeconds: 45 }, { holdSeconds: 30 })).toBe(true)
    expect(isPR('hold-seconds', { holdSeconds: 30 }, { holdSeconds: 45 })).toBe(false)
  })

  it('isPR level', () => {
    expect(isPR('level', { level: 4 }, { level: 3 })).toBe(true)
  })

  it('updateStreak consecutive', () => {
    let s = updateStreak({ current: 0, best: 0 }, '2026-01-01')
    expect(s.current).toBe(1)
    s = updateStreak(s, '2026-01-02')
    expect(s.current).toBe(2)
    expect(s.best).toBe(2)
  })

  it('updateStreak same day no change', () => {
    const s = updateStreak({ current: 5, best: 5, lastTrainingDate: '2026-01-05' }, '2026-01-05')
    expect(s.current).toBe(5)
  })

  it('updateStreak gap resets', () => {
    const s = updateStreak({ current: 5, best: 10, lastTrainingDate: '2026-01-01' }, '2026-01-05')
    expect(s.current).toBe(1)
    expect(s.best).toBe(10)
  })
})
