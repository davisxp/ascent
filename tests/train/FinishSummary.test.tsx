/**
 * FinishSummary render tests — XP breakdown, PR list, level and streak.
 */

import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { FinishSummary } from '../../src/features/train/FinishSummary'
import { exerciseById } from '../../src/content/index'
import { branded } from '../../src/domain/ids'
import type { DateISO, ExerciseId, RPE, SetId, WorkoutId } from '../../src/domain/ids'
import type { Exercise, Workout } from '../../src/domain/index'

const setId = (n: number): SetId => branded<SetId>(`set-${n}`)
const rpe = (n: number): RPE => branded<RPE>(n)

const pushupDef = [...exerciseById.values()].find(
  (e) => e.metric === 'reps' && e.pattern === 'push',
)
const squatDef = [...exerciseById.values()].find(
  (e) => e.metric === 'reps' && e.pattern === 'squat',
)
if (!pushupDef || !squatDef) throw new Error('content must seed push and squat rep exercises')
const pushup: Exercise = pushupDef
const squat: Exercise = squatDef

function makeWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: branded<WorkoutId>('w-1'),
    date: branded<DateISO>('2026-11-15'),
    dayIndex: 0,
    weekIndex: 0,
    mesocycleIndex: 0,
    isDeload: false,
    split: 'full-body',
    durationSeconds: 1534,
    xpAwarded: 0,
    prs: [] as ExerciseId[],
    why: 'Full-body day: hit push, pull, squat, hinge and core in one session.',
    exercises: [
      {
        exerciseId: pushup.id,
        name: pushup.name,
        metric: 'reps',
        sets: [
          { id: setId(1), exerciseId: pushup.id, reps: 20, rpe: rpe(7), completed: true, order: 0 },
          { id: setId(2), exerciseId: pushup.id, reps: 15, rpe: rpe(8), completed: true, order: 1 },
        ],
      },
      {
        exerciseId: squat.id,
        name: squat.name,
        metric: 'reps',
        sets: [
          { id: setId(3), exerciseId: squat.id, reps: 10, rpe: rpe(5), completed: false, order: 0 },
        ],
      },
    ],
    ...overrides,
  }
}

const level = { level: 3, rank: 'Corporal' as const, xp: 2145, xpToNext: 855 }
const streak = { current: 4, best: 9 }

describe('FinishSummary', () => {
  it('renders duration as mm:ss and counts only completed sets', () => {
    render(<FinishSummary workout={makeWorkout()} level={level} streak={streak} onDone={() => {}} />)
    expect(screen.getByText('25:34')).toBeInTheDocument()
    expect(screen.getByText('Sets logged')).toBeInTheDocument()
    expect(screen.getByText('2', { selector: 'p' })).toBeInTheDocument()
  })

  it('breaks down XP: sets × 5 + 50 workout bonus + PRs × 40', () => {
    const workout = makeWorkout({
      prs: [pushup.id],
      xpAwarded: 10 + 50 + 40,
    })
    render(<FinishSummary workout={workout} level={level} streak={streak} onDone={() => {}} />)
    expect(screen.getByText('New personal records')).toBeInTheDocument()
    expect(screen.getByText('+100')).toBeInTheDocument() // 2 sets + workout + 1 PR
    expect(screen.getByText('+40')).toBeInTheDocument()
    expect(screen.getByText('2145')).toBeInTheDocument() // lifetime XP
  })

  it('shows level, rank, and streak', () => {
    render(<FinishSummary workout={makeWorkout()} level={level} streak={streak} onDone={() => {}} />)
    expect(screen.getByText('Level 3')).toBeInTheDocument()
    expect(screen.getByText('Corporal')).toBeInTheDocument()
    expect(screen.getByText('4 days')).toBeInTheDocument()
    expect(screen.getByText('best 9')).toBeInTheDocument()
  })

  it('omits the PR card when no PR was set', () => {
    render(<FinishSummary workout={makeWorkout()} level={level} streak={streak} onDone={() => {}} />)
    expect(screen.queryByText('New personal records')).not.toBeInTheDocument()
  })

  it('calls onDone when Done is clicked', () => {
    const onDone = vi.fn()
    render(<FinishSummary workout={makeWorkout()} level={level} streak={streak} onDone={onDone} />)
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onDone).toHaveBeenCalledOnce()
  })
})
