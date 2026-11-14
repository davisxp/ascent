import { describe, it, expect } from 'vitest'
import { branded, id, todayISO } from '../src/domain/ids'

describe('domain primitives', () => {
  it('generates a uuid', () => {
    const a = id()
    const b = id()
    expect(a).toBeDefined()
    expect(a).not.toBe(b)
  })

  it('todayISO returns YYYY-MM-DD', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('branded cast is identity at runtime', () => {
    expect(branded('abc')).toBe('abc')
    expect(branded(5)).toBe(5)
  })
})
