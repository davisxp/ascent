/**
 * Today — dashboard: level/streak/fuel/body snapshot, today's
 * planned session (from the persisted day plan), and recent
 * workouts. Session playback lives in Train; this screen links to
 * it through the router rather than importing across features.
 */

import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, Ring } from '../../ui/primitives'
import {
  WorkoutRepositoryImpl,
  DayPlanRepositoryImpl,
  GamificationRepositoryImpl,
  FoodLogRepositoryImpl,
  BodyRepositoryImpl,
} from '../../data/repositories'
import { useRouter } from '../../app/useRouter'
import type { DayPlan, Workout, LevelInfo, Streak } from '../../domain/index'
import { todayISO } from '../../domain/ids'

const workoutRepo = new WorkoutRepositoryImpl()
const dayPlanRepo = new DayPlanRepositoryImpl()
const gamificationRepo = new GamificationRepositoryImpl()
const foodLogRepo = new FoodLogRepositoryImpl()
const bodyRepo = new BodyRepositoryImpl()

const SPLIT_LABEL: Record<Workout['split'], string> = {
  'full-body': 'Full body',
  upper: 'Upper',
  lower: 'Lower',
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  mobility: 'Mobility',
}

const Stat = ({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub?: string
  color: string
}) => (
  <div className="flex flex-col items-center text-center min-w-[72px]">
    <p className="font-mono text-xl font-bold leading-none" style={{ color }}>
      {value}
    </p>
    <p className="text-xs text-ink/50 mt-1">{label}</p>
    {sub && <p className="text-[10px] text-ink/40 font-mono">{sub}</p>}
  </div>
)

export const Today = () => {
  const { navigate } = useRouter()
  const [level, setLevel] = useState<LevelInfo | null>(null)
  const [streak, setStreak] = useState<Streak | null>(null)
  const [fuel, setFuel] = useState<{ kcal: number; proteinG: number; waterMl: number } | null>(null)
  const [weight, setWeight] = useState<number | null>(null)
  const [todaysPlan, setTodaysPlan] = useState<DayPlan | null>(null)
  const [doneToday, setDoneToday] = useState<Workout | null>(null)
  const [recent, setRecent] = useState<Workout[]>([])
  const [hasProfile, setHasProfile] = useState<boolean | null>(null)
  const today = todayISO()

  useEffect(() => {
    let cancelled = false
    // The day plan is stored under the weekStart used when the week
    // was generated; scan the last 7 day keys for one covering today.
    const last7 = Array.from({ length: 7 }, (_, i) =>
      new Date(new Date(today).getTime() - i * 86400000).toISOString().slice(0, 10),
    )
    Promise.all([
      gamificationRepo.getLevel().catch(() => null),
      gamificationRepo.getStreak().catch(() => null),
      foodLogRepo.getDailyTotals(today).catch(() => null),
      bodyRepo.getWeightEntries().catch(() => []),
      bodyRepo.getProfile().catch(() => null),
      workoutRepo.getByDate(today).catch(() => null),
      workoutRepo.getAll().catch(() => [] as Workout[]),
      Promise.all(last7.map((d) => dayPlanRepo.getWeek(d).catch(() => [] as DayPlan[])))
        .then((weeks) => weeks.flat())
        .catch(() => [] as DayPlan[]),
    ])
      .then(([lv, st, totals, weights, profile, logged, all, plans]) => {
        if (cancelled) return
        setLevel(lv)
        setStreak(st)
        if (totals) setFuel({ kcal: totals.kcal, proteinG: totals.proteinG, waterMl: totals.waterMl })
        const sorted = [...weights].sort((a, b) => (a.date < b.date ? -1 : 1))
        const latest = sorted.at(-1)
        if (latest) setWeight(latest.weightKg)
        setHasProfile(!!profile?.assessmentCompleted)
        if (logged?.completedAt) setDoneToday(logged)
        setRecent(all.filter((w) => w.completedAt).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5))
        setTodaysPlan(plans.find((p) => p.date === today) ?? null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [today])

  const heading = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(new Date()),
    [],
  )

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Today</h1>
      <p className="text-sm text-ink/60 mb-4">{heading}</p>

      <Card className="mb-4">
        <div className="flex items-center justify-around gap-2 flex-wrap">
          <Ring
            value={level ? Math.min(level.xp, level.level * 1000) : 0}
            max={level ? level.level * 1000 : 1}
            size={64}
            color="var(--color-marigold)"
            label={`Level ${level?.level ?? 1} progress: ${level?.xp ?? 0} XP, ${level?.xpToNext ?? 1000} to next`}
          />
          <Stat
            label="Streak"
            value={String(streak?.current ?? 0)}
            sub={streak ? `best ${streak.best}` : undefined}
            color="var(--color-clay)"
          />
          <Stat
            label="Kcal today"
            value={fuel ? String(fuel.kcal) : '—'}
            color="var(--color-pine)"
          />
          <Stat
            label="Water"
            value={fuel ? `${fuel.waterMl}` : '—'}
            sub="ml"
            color="var(--color-teal)"
          />
          <Stat label="Weight" value={weight != null ? String(weight) : '—'} sub="kg" color="var(--color-ink)" />
        </div>
      </Card>

      {hasProfile === false && (
        <Card className="mb-4 border-pine">
          <h2 className="font-display text-lg font-bold mb-1">Welcome</h2>
          <p className="text-sm text-ink/60 mb-3">
            Set up your profile to generate a personalized plan.
          </p>
          <Button variant="primary" className="h-11 px-5" onClick={() => navigate('/onboarding')}>
            Start onboarding
          </Button>
        </Card>
      )}

      <Card className="mb-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 className="font-display text-lg font-bold">Today's session</h2>
          {doneToday ? (
            <Badge variant="success">Logged</Badge>
          ) : todaysPlan ? (
            <Badge variant="pine">{SPLIT_LABEL[todaysPlan.split]}</Badge>
          ) : (
            <Badge>Rest</Badge>
          )}
        </div>
        {doneToday ? (
          <p className="text-sm text-ink/60">
            {SPLIT_LABEL[doneToday.split]} · {Math.round(doneToday.durationSeconds / 60)} min ·{' '}
            {doneToday.xpAwarded} XP earned
          </p>
        ) : todaysPlan ? (
          <>
            <ul className="space-y-1 mb-3">
              {todaysPlan.exercises.map((ex) => (
                <li key={ex.exerciseId} className="text-sm flex flex-wrap items-baseline gap-x-2">
                  <span className="font-bold">{ex.name}</span>
                  <span className="font-mono text-xs text-ink/50">
                    {ex.targetSets} ×{' '}
                    {ex.metric === 'hold-seconds'
                      ? `${ex.targetHoldSeconds ?? 30}s`
                      : ex.targetReps
                        ? `${ex.targetReps[0]}–${ex.targetReps[1]}`
                        : 'reps'}
                  </span>
                </li>
              ))}
            </ul>
            <Button variant="primary" className="h-11 px-5" onClick={() => navigate('/train')}>
              Start session
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-ink/50 mb-3">
              No session planned for today. Open Train to generate your week.
            </p>
            <Button variant="outline" className="h-11 px-5" onClick={() => navigate('/train')}>
              Go to Train
            </Button>
          </>
        )}
      </Card>

      <div className="border-t border-ink/10 my-4" />

      <div>
        <h2 className="font-display text-lg font-bold mb-2">Recent workouts</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-ink/50">No workouts yet. Start your first session.</p>
        ) : (
          <ul className="divide-y divide-ink/5">
            {recent.map((w) => (
              <li key={w.id} className="py-2 flex items-baseline justify-between gap-2 text-sm">
                <span>
                  <span className="font-bold">{SPLIT_LABEL[w.split]}</span>
                  <span className="ml-2 font-mono text-xs text-ink/40">{w.date}</span>
                </span>
                <span className="font-mono text-xs text-ink/60">
                  {Math.round(w.durationSeconds / 60)} min · {w.xpAwarded} XP
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
