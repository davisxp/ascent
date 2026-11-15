/**
 * Train week view — shows the generated mesocycle week and starts
 * workout sessions. The plan comes from the plan generator (engine)
 * persisted through the day-plan repository; sessions open in the
 * fullscreen WorkoutPlayer, which ends in the FinishSummary.
 */

import { useEffect, useState } from 'react'
import { Badge, Button, Card } from '../../ui/primitives'
import { useTrainStore } from './store'
import { WorkoutPlayer } from './WorkoutPlayer'
import { FinishSummary } from './FinishSummary'
import { whyWorkout } from '../../engine/planGenerator'
import type { Workout } from '../../domain/index'

const splitLabel: Record<string, string> = {
  'full-body': 'Full body',
  upper: 'Upper',
  lower: 'Lower',
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  mobility: 'Mobility',
}

export const Train = () => {
  const weekPlan = useTrainStore((s) => s.weekPlan)
  const activeWorkout = useTrainStore((s) => s.activeWorkout)
  const activeDayIndex = useTrainStore((s) => s.activeDayIndex)
  const barEnabled = useTrainStore((s) => s.barEnabled)
  const defaultRestSeconds = useTrainStore((s) => s.defaultRestSeconds)
  const goal = useTrainStore((s) => s.goal)
  const level = useTrainStore((s) => s.level)
  const streak = useTrainStore((s) => s.streak)
  const isLoading = useTrainStore((s) => s.isLoading)
  const [summary, setSummary] = useState<Workout | null>(null)
  const [loggedDates, setLoggedDates] = useState<string[]>([])

  useEffect(() => {
    void useTrainStore.getState().init()
  }, [])

  const handleFinish = async () => {
    const finished = await useTrainStore.getState().completeWorkout()
    setLoggedDates((dates) => (dates.includes(finished.date) ? dates : [...dates, finished.date]))
    setSummary(finished)
  }

  const isDeload = (weekPlan?.index ?? 0) === 3

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-2xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Train</h1>
          <p className="text-sm text-ink/60">Your week, generated from your placements.</p>
          {weekPlan && (
            <p className="text-xs font-mono text-ink/40 mt-1">
              Mesocycle week {(weekPlan.index ?? 0) + 1} of 4
              {isDeload ? ' · deload' : ''}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono text-lg font-bold text-marigold">{level.xp} XP</p>
          <p className="text-xs text-ink/50">
            Lv {level.level} · {level.rank} · streak {streak.current}
          </p>
          <button
            type="button"
            className="text-xs text-pine underline mt-1"
            onClick={() => void useTrainStore.getState().generateWeek(0)}
          >
            Regenerate week
          </button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-ink/50">Loading your plan…</p>}

      {weekPlan && (
        <div className="space-y-3">
          {weekPlan.days.map((day, dayIndex) => {
            const isToday = dayIndex === 0
            const done = loggedDates.includes(day.date)
            return (
              <Card key={day.date} className={isToday ? 'border-pine' : undefined}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-lg font-bold">
                        {splitLabel[day.split] ?? day.split}
                      </h2>
                      {isToday && <Badge variant="pine">Today</Badge>}
                      {done && <Badge variant="success">Logged</Badge>}
                    </div>
                    <p className="text-xs text-ink/40 font-mono">{day.date}</p>
                  </div>
                  <Button
                    variant={isToday ? 'primary' : 'outline'}
                    className="h-11 px-4 shrink-0"
                    aria-label={`Start ${splitLabel[day.split] ?? day.split} workout`}
                    onClick={() => void useTrainStore.getState().startWorkout(dayIndex)}
                  >
                    Start
                  </Button>
                </div>

                <p className="text-xs text-ink/50 italic mb-2">
                  {whyWorkout(day, { goal, deload: isDeload })}
                </p>

                <ul className="space-y-1">
                  {day.exercises.map((ex) => (
                    <li key={ex.exerciseId} className="text-sm flex flex-wrap items-baseline gap-x-2">
                      <span className="font-bold">{ex.name}</span>
                      <span className="text-ink/50 font-mono text-xs">
                        {ex.targetSets} ×{' '}
                        {ex.metric === 'hold-seconds'
                          ? `${ex.targetHoldSeconds ?? 30}s hold`
                          : ex.targetReps
                            ? `${ex.targetReps[0]}–${ex.targetReps[1]} reps`
                            : 'reps'}
                        {` · rest ${ex.restSeconds}s`}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )
          })}
        </div>
      )}

      {!isLoading && !weekPlan && (
        <Card>
          <p className="text-sm text-ink/50">
            No plan yet. Add your placements in onboarding, then come back to generate a week.
          </p>
        </Card>
      )}

      {activeWorkout && (
        <WorkoutPlayer
          workout={activeWorkout}
          dayPlan={
            activeDayIndex != null ? weekPlan?.days[activeDayIndex] ?? null : null
          }
          barEnabled={barEnabled}
          defaultRestSeconds={defaultRestSeconds}
          onUpdateSet={(exerciseId, setIndex, updates) =>
            useTrainStore.getState().updateSet(exerciseId, setIndex, updates)
          }
          onSwap={(exerciseId, direction) =>
            void useTrainStore.getState().swapExercise(exerciseId, direction)
          }
          onQuit={() => useTrainStore.getState().quitWorkout()}
          onFinish={() => void handleFinish()}
        />
      )}

      {summary && (
        <FinishSummary
          workout={summary}
          level={level}
          streak={streak}
          onDone={() => setSummary(null)}
        />
      )}
    </div>
  )
}
