/**
 * WorkoutPlayer — fullscreen workout session view.
 * Drives set logging, rest + hold timers, exercise swaps, and the
 * finish/quit flows. Focus is trapped while the dialog is open and
 * the screen wake lock is held for the duration of the session.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Button, Card } from '../../ui/primitives'
import { SetLogger } from './SetLogger'
import { RestTimer } from './RestTimer'
import { HoldTimer } from './HoldTimer'
import { ExerciseSwap } from './ExerciseSwap'
import { wakeLock } from '../../platform/wakelock'
import { exerciseById } from '../../content/index'
import type { SwapDirection } from '../../engine/swap'
import type { DayPlan, SetLog, Workout } from '../../domain/index'

type WorkoutPlayerProps = {
  workout: Workout
  /** Plan entry targets for the day the workout belongs to. */
  dayPlan: DayPlan | null
  barEnabled: boolean
  defaultRestSeconds: number
  onUpdateSet: (exerciseId: string, setIndex: number, updates: Partial<SetLog>) => void
  onSwap: (exerciseId: string, direction: SwapDirection) => void
  onQuit: () => void
  onFinish: () => void
}

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select, textarea, a[href], [tabindex]:not([tabindex="-1"])'

export const WorkoutPlayer = ({
  workout,
  dayPlan,
  barEnabled,
  defaultRestSeconds,
  onUpdateSet,
  onSwap,
  onQuit,
  onFinish,
}: WorkoutPlayerProps): JSX.Element => {
  const [restingSeconds, setRestingSeconds] = useState<number | null>(null)
  const [swappingFor, setSwappingFor] = useState<string | null>(null)
  const [confirmQuit, setConfirmQuit] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // ---- wake lock + initial focus ----
  useEffect(() => {
    void wakeLock.request()
    containerRef.current?.focus()
    return () => {
      void wakeLock.release()
    }
  }, [])

  // ---- focus trap + escape ----
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setConfirmQuit(true)
        return
      }
      if (e.key !== 'Tab') return
      const root = containerRef.current
      if (!root) return
      const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null, // visible only
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [],
  )

  // ---- progress + active set derivation ----
  const { totalSets, completedSets, activeExerciseId, activeSetIndex } = useMemo(() => {
    let total = 0
    let done = 0
    let activeExercise: string | null = null
    let activeSet = -1
    for (const ex of workout.exercises) {
      total += ex.sets.length
      for (const set of ex.sets) {
        if (set.completed) {
          done += 1
        } else if (activeExercise === null) {
          activeExercise = ex.exerciseId
          activeSet = set.order
        }
      }
    }
    return {
      totalSets: total,
      completedSets: done,
      activeExerciseId: activeExercise,
      activeSetIndex: activeSet,
    }
  }, [workout])

  const planEntryFor = useCallback(
    (exerciseId: string) => dayPlan?.exercises.find((e) => e.exerciseId === exerciseId) ?? null,
    [dayPlan],
  )

  const exerciseDef = useCallback(
    (exerciseId: string) => exerciseById.get(exerciseId) ?? null,
    [],
  )

  // ---- auto-scroll to the active exercise ----
  const activeCardRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!activeExerciseId || restingSeconds !== null || swappingFor || confirmQuit) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    activeCardRef.current?.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'nearest',
    })
  }, [activeExerciseId, restingSeconds, swappingFor, confirmQuit])

  const startRest = useCallback(
    (exerciseId: string) => {
      const seconds = planEntryFor(exerciseId)?.restSeconds ?? defaultRestSeconds
      setRestingSeconds(seconds)
    },
    [planEntryFor, defaultRestSeconds],
  )

  const allDone = totalSets > 0 && completedSets === totalSets
  const canFinish = completedSets >= 1

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Workout session — ${workout.split} day`}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-40 paper-bg overflow-y-auto focus-visible:outline-none"
    >
      <div className="max-w-2xl mx-auto p-4 pb-32">
        {/* header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-ink/40">
              {workout.isDeload ? 'Deload week · ' : ''}Week {workout.weekIndex + 1} ·{' '}
              {workout.date}
            </p>
            <h1 className="font-display text-2xl font-bold tracking-tight capitalize">
              {workout.split} day
            </h1>
            <p className="text-sm text-ink/50" aria-live="polite">
              {completedSets} of {totalSets} sets logged
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => setConfirmQuit(true)}
            aria-label="Quit workout"
            className="h-11 w-11 p-0 text-xl text-ink/50"
          >
            ✕
          </Button>
        </div>

        {/* exercise cards */}
        <div className="space-y-4">
          {workout.exercises.map((ex, exIdx) => {
            const def = exerciseDef(ex.exerciseId)
            const plan = planEntryFor(ex.exerciseId)
            const isActive = ex.exerciseId === activeExerciseId
            return (
              <div key={`${ex.exerciseId}-${exIdx}`} ref={isActive ? activeCardRef : undefined}>
                <Card className={isActive ? 'border-pine' : undefined}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h2 className="font-display text-lg font-bold leading-tight">
                        {exIdx + 1}. {ex.name}
                      </h2>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {plan?.targetReps && (
                          <Badge variant="pine">
                            {plan.targetSets} × {plan.targetReps[0]}–{plan.targetReps[1]} reps
                          </Badge>
                        )}
                        {ex.metric === 'hold-seconds' && plan?.targetHoldSeconds && (
                          <Badge variant="pine">Hold {plan.targetHoldSeconds}s</Badge>
                        )}
                        <Badge variant="warn">RPE cap {plan?.rpeCap ?? 8}</Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="h-11 px-3 shrink-0"
                      aria-label={`Swap ${ex.name}`}
                      onClick={() => setSwappingFor(ex.exerciseId)}
                    >
                      Swap
                    </Button>
                  </div>

                  {/* set chips */}
                  <ul className="flex flex-wrap gap-2 mb-3" aria-label={`Sets for ${ex.name}`}>
                    {ex.sets.map((s, i) => {
                      const logged = s.reps != null ? `${s.reps}` : s.holdSeconds != null ? `${s.holdSeconds}s` : null
                      return (
                        <li
                          key={s.id}
                          aria-current={i === activeSetIndex && isActive ? 'step' : undefined}
                          className={`min-w-[44px] h-11 px-2 inline-flex items-center justify-center gap-1 rounded-[10px] border font-mono text-sm ${
                            s.completed
                              ? 'bg-pine text-white border-pine'
                              : i === activeSetIndex && isActive
                                ? 'border-pine text-pine bg-white'
                                : 'border-ink/15 text-ink/40 bg-white'
                          }`}
                        >
                          {s.completed ? '✓' : i + 1}
                          {s.completed && logged ? <span className="text-xs">{logged}</span> : null}
                        </li>
                      )
                    })}
                  </ul>

                  {/* form cues */}
                  {def && def.cues.length > 0 && (
                    <details className="mb-3 text-sm text-ink/60">
                      <summary className="cursor-pointer select-none text-pine font-bold">
                        Form cues
                      </summary>
                      <ul className="list-disc pl-5 mt-1 space-y-0.5">
                        {def.cues.map((cue) => (
                          <li key={cue}>{cue}</li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {/* active set logger */}
                  {isActive && activeSetIndex >= 0 && (
                    <div className="border-t border-ink/10 pt-4">
                      {ex.metric === 'hold-seconds' && (
                        <div className="mb-4">
                          <HoldTimer
                            targetSeconds={plan?.targetHoldSeconds ?? 30}
                            onComplete={(held) =>
                              onUpdateSet(ex.exerciseId, activeSetIndex, { holdSeconds: held })
                            }
                          />
                        </div>
                      )}
                      <SetLogger
                        exerciseId={ex.exerciseId}
                        metric={ex.metric}
                        setIndex={activeSetIndex}
                        currentSet={ex.sets[activeSetIndex]}
                        onUpdate={(updates) => onUpdateSet(ex.exerciseId, activeSetIndex, updates)}
                        onComplete={() => startRest(ex.exerciseId)}
                      />
                      <p className="text-xs text-ink/40 mt-3">
                        Rest {plan?.restSeconds ?? defaultRestSeconds}s after each set.
                      </p>
                    </div>
                  )}
                </Card>
              </div>
            )
          })}
        </div>

        {/* finish */}
        <Card className="mt-6">
          {allDone ? (
            <>
              <p className="font-display text-lg font-bold mb-1">All sets logged</p>
              <p className="text-sm text-ink/60 mb-3">
                Finish the session to bank your XP and check for PRs.
              </p>
            </>
          ) : (
            <p className="text-sm text-ink/60 mb-3">
              {canFinish
                ? 'You can finish now — unlogged sets simply won’t count.'
                : 'Log at least one set to finish a session.'}
            </p>
          )}
          <Button
            variant="primary"
            className="h-12 px-6 w-full"
            disabled={!canFinish}
            onClick={onFinish}
          >
            Finish workout
          </Button>
        </Card>
      </div>

      {/* rest overlay */}
      {restingSeconds !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Rest timer"
          className="fixed inset-0 z-50 paper-bg overflow-y-auto flex items-center justify-center p-4"
        >
          <RestTimer
            durationSeconds={restingSeconds}
            onComplete={() => setRestingSeconds(null)}
            onSkip={() => setRestingSeconds(null)}
          />
        </div>
      )}

      {/* swap overlay */}
      {swappingFor && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Swap exercise"
          className="fixed inset-0 z-50 bg-ink/40 overflow-y-auto flex items-center justify-center p-4"
        >
          <ExerciseSwap
            exerciseId={swappingFor}
            barEnabled={barEnabled}
            onSwap={(direction) => {
              onSwap(swappingFor, direction)
              setSwappingFor(null)
            }}
            onClose={() => setSwappingFor(null)}
          />
        </div>
      )}

      {/* quit confirm overlay */}
      {confirmQuit && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Discard session"
          className="fixed inset-0 z-50 bg-ink/40 overflow-y-auto flex items-center justify-center p-4"
        >
          <Card className="max-w-sm w-full">
            <h2 className="font-display text-lg font-bold mb-1">Discard session?</h2>
            <p className="text-sm text-ink/60 mb-4">
              {completedSets > 0
                ? `${completedSets} logged set${completedSets === 1 ? '' : 's'} won’t be saved.`
                : 'Nothing has been logged yet.'}
            </p>
            <div className="flex gap-3">
              <Button
                variant="primary"
                className="h-12 px-4 flex-1"
                onClick={() => setConfirmQuit(false)}
              >
                Keep training
              </Button>
              <Button
                variant="outline"
                className="h-12 px-4 flex-1"
                onClick={onQuit}
              >
                Discard
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
