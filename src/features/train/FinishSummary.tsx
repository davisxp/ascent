/**
 * FinishSummary — post-workout recap shown after a session is saved.
 * Recaps duration, XP breakdown, PRs, level, and streak, then returns
 * the user to the week view. Plays the PR chime only when a PR was set.
 */

import { useEffect, useRef } from 'react'
import { Badge, Button, Card } from '../../ui/primitives'
import { sound } from '../../platform/sound'
import { exerciseById } from '../../content/index'
import type { LevelInfo, Streak, Workout } from '../../domain/index'

type FinishSummaryProps = {
  workout: Workout
  level: LevelInfo
  streak: Streak
  onDone: () => void
}

const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const setsCompleted = (workout: Workout): number =>
  workout.exercises.reduce((n, ex) => n + ex.sets.filter((s) => s.completed).length, 0)

export const FinishSummary = ({
  workout,
  level,
  streak,
  onDone,
}: FinishSummaryProps): JSX.Element => {
  const chimeRef = useRef(false)
  const prCount = workout.prs.length

  useEffect(() => {
    if (chimeRef.current) return
    chimeRef.current = true
    if (prCount > 0) sound.prChime()
    else if (workout.xpAwarded > 0) sound.levelUp()
  }, [prCount, workout.xpAwarded])

  const setsDone = setsCompleted(workout)
  const setXP = setsDone * 5
  const prXP = prCount * 40

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Workout summary"
      className="fixed inset-0 z-40 paper-bg overflow-y-auto"
    >
      <div className="max-w-2xl mx-auto p-4 pb-16">
        <p className="text-[11px] font-mono uppercase tracking-widest text-ink/40">
          {workout.date} · {workout.isDeload ? 'Deload week' : `Week ${workout.weekIndex + 1}`}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight mb-1 capitalize">
          Session complete
        </h1>
        <p className="text-sm text-ink/50 mb-6">{workout.why}</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card>
            <p className="text-[11px] font-mono uppercase tracking-widest text-ink/40 mb-1">
              Duration
            </p>
            <p className="font-mono text-3xl font-bold text-ink">
              {formatDuration(workout.durationSeconds)}
            </p>
          </Card>
          <Card>
            <p className="text-[11px] font-mono uppercase tracking-widest text-ink/40 mb-1">
              Sets logged
            </p>
            <p className="font-mono text-3xl font-bold text-ink">{setsDone}</p>
          </Card>
        </div>

        <Card className="mb-4">
          <h2 className="font-display text-lg font-bold mb-2">XP earned</h2>
          <ul className="space-y-1 text-sm" aria-label="XP breakdown">
            <li className="flex justify-between">
              <span className="text-ink/60">
                {setsDone} set{setsDone === 1 ? '' : 's'} × 5 XP
              </span>
              <span className="font-mono">+{setXP}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-ink/60">Workout complete</span>
              <span className="font-mono">+50</span>
            </li>
            <li className="flex justify-between">
              <span className="text-ink/60">
                {prCount} PR{prCount === 1 ? '' : 's'} × 40 XP
              </span>
              <span className="font-mono">+{prXP}</span>
            </li>
            <li className="flex justify-between border-t border-ink/10 pt-2 mt-2 font-bold">
              <span>Total this session</span>
              <span className="font-mono text-marigold">+{workout.xpAwarded}</span>
            </li>
            <li className="flex justify-between text-ink/60">
              <span>Lifetime XP</span>
              <span className="font-mono">{level.xp}</span>
            </li>
          </ul>
        </Card>

        <Card className="mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">Level {level.level}</h2>
              <p className="text-sm text-ink/60">{level.rank}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-mono uppercase tracking-widest text-ink/40 mb-1">
                Streak
              </p>
              <p className="font-mono text-2xl font-bold text-marigold">
                {streak.current} day{streak.current === 1 ? '' : 's'}
              </p>
              <p className="text-xs text-ink/40">best {streak.best}</p>
            </div>
          </div>
          <p className="text-xs text-ink/40 mt-2">{level.xpToNext} XP to next level</p>
        </Card>

        {prCount > 0 && (
          <Card className="mb-4 border-clay">
            <h2 className="font-display text-lg font-bold mb-2 text-clay">New personal records</h2>
            <ul className="space-y-2">
              {workout.prs.map((exerciseId) => {
                const def = exerciseById.get(exerciseId)
                return (
                  <li key={exerciseId} className="flex items-center gap-2">
                    <Badge variant="danger">PR</Badge>
                    <span className="text-sm font-bold">{def?.name ?? exerciseId}</span>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}

        <Button variant="primary" className="h-12 px-6 w-full" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  )
}
