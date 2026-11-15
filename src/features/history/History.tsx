/**
 * History — month calendar + list of past workouts with detail
 * expansion, inline set editing, delete with undo (XP is returned
 * on undo). Streak is not recomputed on delete (documented limit).
 */

import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, Input } from '../../ui/primitives'
import {
  WorkoutRepositoryImpl,
  GamificationRepositoryImpl,
} from '../../data/repositories'
import type { Workout, SetLog } from '../../domain/index'
import { branded } from '../../domain/ids'
import type { DateISO, RPE } from '../../domain/ids'
import { monthGrid, monthTitle, shiftMonth } from './calendar'

const workoutRepo = new WorkoutRepositoryImpl()
const gamificationRepo = new GamificationRepositoryImpl()

const SPLIT_LABEL: Record<Workout['split'], string> = {
  'full-body': 'Full body',
  upper: 'Upper',
  lower: 'Lower',
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  mobility: 'Mobility',
}

const setDisplay = (s: SetLog, metric: 'reps' | 'hold-seconds' | 'level'): string => {
  if (!s.completed) return '—'
  if (metric === 'reps') return `${s.reps ?? 0} reps @ RPE ${s.rpe}`
  if (metric === 'hold-seconds') return `${s.holdSeconds ?? 0}s hold @ RPE ${s.rpe}`
  return `level ${s.level ?? 0} @ RPE ${s.rpe}`
}

const WorkoutDetail = ({ workout }: { workout: Workout }) => {
  const [draft, setDraft] = useState<Workout>(workout)
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  const saveEdits = () => {
    void workoutRepo.save(draft).then(() => {
      setDirty(false)
      setSaved(true)
    })
  }

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: 'reps' | 'holdSeconds' | 'level' | 'rpe',
    raw: string,
  ) => {
    const value = Number(raw)
    if (!(value >= 0)) return
    const next = structuredClone(draft)
    const set = next.exercises[exerciseIndex].sets[setIndex]
    if (field === 'rpe') {
      set.rpe = branded<RPE>(Math.min(10, Math.max(1, Math.round(value))))
    } else {
      set[field] = Math.round(value)
    }
    setDraft(next)
    setDirty(true)
    setSaved(false)
  }

  return (
    <div className="mt-3 border-t border-ink/10 pt-3">
      <p className="text-xs italic text-ink/50 mb-2">{workout.why}</p>
      {workout.exercises.map((ex, ei) => (
        <div key={ex.exerciseId} className="mb-3">
          <p className="text-sm font-bold">
            {ex.name}
            <span className="ml-2 font-mono text-[10px] uppercase text-ink/40">{ex.metric}</span>
          </p>
          <ul className="mt-1 space-y-1">
            {ex.sets.map((s, si) => (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <span className="w-10 font-mono text-[10px] text-ink/40">#{si + 1}</span>
                <span className="w-40 font-mono text-xs">{setDisplay(s, ex.metric)}</span>
                <span className="flex items-center gap-1">
                  {ex.metric === 'reps' && (
                    <Input
                      type="number"
                      inputMode="numeric"
                      aria-label={`${ex.name} set ${si + 1} reps`}
                      defaultValue={s.reps ?? ''}
                      onChange={(e) => updateSet(ei, si, 'reps', e.target.value)}
                      className="w-16 h-8 text-xs"
                    />
                  )}
                  {ex.metric === 'hold-seconds' && (
                    <Input
                      type="number"
                      inputMode="numeric"
                      aria-label={`${ex.name} set ${si + 1} hold seconds`}
                      defaultValue={s.holdSeconds ?? ''}
                      onChange={(e) => updateSet(ei, si, 'holdSeconds', e.target.value)}
                      className="w-16 h-8 text-xs"
                    />
                  )}
                  {ex.metric === 'level' && (
                    <Input
                      type="number"
                      inputMode="numeric"
                      aria-label={`${ex.name} set ${si + 1} level`}
                      defaultValue={s.level ?? ''}
                      onChange={(e) => updateSet(ei, si, 'level', e.target.value)}
                      className="w-16 h-8 text-xs"
                    />
                  )}
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="10"
                    aria-label={`${ex.name} set ${si + 1} RPE`}
                    defaultValue={s.rpe}
                    onChange={(e) => updateSet(ei, si, 'rpe', e.target.value)}
                    className="w-14 h-8 text-xs"
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {dirty && (
        <Button variant="primary" className="h-10 px-4" onClick={saveEdits}>
          Save changes
        </Button>
      )}
      {!dirty && saved && (
        <p className="text-xs text-pine font-bold" role="status">
          Changes saved.
        </p>
      )}
    </div>
  )
}

const WorkoutRow = ({
  workout,
  onDelete,
}: {
  workout: Workout
  onDelete: (w: Workout) => void
}) => {
  const [open, setOpen] = useState(false)
  const sets = workout.exercises.reduce((s, e) => s + e.sets.filter((x) => x.completed).length, 0)
  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <button
          className="text-left flex-1 min-w-0"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm">{SPLIT_LABEL[workout.split]}</span>
            {workout.prs.length > 0 && <Badge variant="warn">{workout.prs.length} PR</Badge>}
          </span>
          <span className="block font-mono text-[10px] text-ink/40 mt-0.5">
            {workout.date} · {Math.round(workout.durationSeconds / 60)} min · {sets} sets ·{' '}
            {workout.xpAwarded} XP
          </span>
        </button>
        <Button
          variant="ghost"
          className="h-9 w-9 p-0 text-ink/40 shrink-0"
          aria-label={`Delete ${SPLIT_LABEL[workout.split]} workout on ${workout.date}`}
          onClick={() => onDelete(workout)}
        >
          ✕
        </Button>
      </div>
      {open && <WorkoutDetail workout={workout} />}
    </li>
  )
}

export const History = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [view, setView] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [lastDeleted, setLastDeleted] = useState<Workout | null>(null)

  useEffect(() => {
    let cancelled = false
    workoutRepo
      .getAll()
      .then((all) => {
        if (cancelled) return
        setWorkouts(all.filter((w) => w.completedAt).sort((a, b) => (a.date < b.date ? 1 : -1)))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const grid = useMemo(() => monthGrid(view.year, view.month), [view])
  const doneDates = useMemo(() => new Set(workouts.map((w) => w.date)), [workouts])
  const monthWorkouts = useMemo(
    () => workouts.filter((w) => w.date.startsWith(`${view.year}-${String(view.month + 1).padStart(2, '0')}`)),
    [workouts, view],
  )

  const deleteWorkout = (w: Workout) => {
    void workoutRepo.delete(w.id).then(() => {
      void gamificationRepo.addXP(-w.xpAwarded).then(() => {
        setWorkouts((all) => all.filter((x) => x.id !== w.id))
        setLastDeleted(w)
      })
    })
  }

  const undoDelete = () => {
    const w = lastDeleted
    if (!w) return
    void workoutRepo.save(w).then(() => {
      void gamificationRepo.addXP(w.xpAwarded).then(() => {
        setWorkouts((all) => [w, ...all].sort((a, b) => (a.date < b.date ? 1 : -1)))
        setLastDeleted(null)
      })
    })
  }

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-1">History</h1>
      <p className="text-sm text-ink/60 mb-4">Every session, kept honest.</p>

      <Card className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            className="h-11 w-11 p-0"
            aria-label="Previous month"
            onClick={() => setView((v) => shiftMonth(v.year, v.month, -1))}
          >
            ‹
          </Button>
          <h2 className="font-display text-lg font-bold">{monthTitle(view.year, view.month)}</h2>
          <Button
            variant="ghost"
            className="h-11 w-11 p-0"
            aria-label="Next month"
            onClick={() => setView((v) => shiftMonth(v.year, v.month, 1))}
          >
            ›
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center" role="img" aria-label={`Calendar for ${monthTitle(view.year, view.month)}; completed workouts are marked`}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={`${d}-${i}`} aria-hidden="true" className="text-[10px] font-mono uppercase text-ink/40">
              {d}
            </span>
          ))}
          {grid.flat().map((cell, i) => {
            if (!cell) return <span key={`pad-${i}`} />
            const day = Number(cell.slice(8))
            const done = doneDates.has(cell as DateISO)
            return (
              <span
                key={cell}
                className={`flex h-9 items-center justify-center rounded-[8px] font-mono text-xs ${
                  done ? 'bg-pine text-white font-bold' : 'text-ink/60'
                }`}
              >
                {day}
              </span>
            )
          })}
        </div>
      </Card>

      {lastDeleted && (
        <Card className="mb-4 border-clay">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm" role="status">
              Workout deleted ({lastDeleted.xpAwarded} XP removed).
            </p>
            <Button variant="outline" className="h-10 px-4 shrink-0" onClick={undoDelete}>
              Undo
            </Button>
          </div>
        </Card>
      )}

      <div className="mt-4 border-t border-ink/10 pt-4">
        <h2 className="font-display text-lg font-bold mb-1">
          {monthTitle(view.year, view.month)} sessions
        </h2>
        {monthWorkouts.length === 0 ? (
          <p className="text-sm text-ink/50">No workouts recorded this month.</p>
        ) : (
          <ul className="divide-y divide-ink/5">
            {monthWorkouts.map((w) => (
              <WorkoutRow key={w.id} workout={w} onDelete={deleteWorkout} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
