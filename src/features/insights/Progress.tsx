/**
 * Progress — training insights: level/streak summary, 12-week
 * training heatmap, volume by movement pattern, PR timeline, and
 * the badge cabinet. All series derive from real persisted data.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  Award,
  CheckCircle2,
  Clock,
  Dumbbell,
  Droplets,
  Egg,
  Flag,
  Flame,
  Footprints,
  Hand,
  Image as ImageIcon,
  Moon,
  RotateCw,
  Scale,
  Scroll,
  Star,
  Sun,
  Triangle,
  User,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge, Card, Ring } from '../../ui/primitives'
import {
  WorkoutRepositoryImpl,
  GamificationRepositoryImpl,
} from '../../data/repositories'
import { BADGES } from '../../engine/gamification'
import type { Badge as BadgeRecord, LevelInfo, Streak, Workout } from '../../domain/index'
import { exerciseById } from '../../content/index'
import { heatmapGrid, volumeByPattern, prTimeline } from './charts'

const workoutRepo = new WorkoutRepositoryImpl()
const gamificationRepo = new GamificationRepositoryImpl()

const BADGE_ICONS: Record<string, LucideIcon> = {
  Triangle,
  Flame,
  Dumbbell,
  Clock,
  Scroll,
  Star,
  Hand,
  User,
  // 'Leg' is the badge icon key used by the pistol/nordic badges in the engine.
  Leg: Footprints,
  RotateCw,
  Flag,
  Egg,
  Droplets,
  Scale,
  Image: ImageIcon,
  Moon,
  Sun,
  CheckCircle2,
  Award,
}

const CATEGORY_COLOR: Record<BadgeRecord['category'], string> = {
  workout: 'var(--color-pine)',
  pr: 'var(--color-clay)',
  flexibility: 'var(--color-teal)',
  skill: 'var(--color-marigold)',
  streak: 'var(--color-marigold)',
  body: 'var(--color-pine)',
  fuel: 'var(--color-teal)',
}

const Heatmap = ({ workouts }: { workouts: Workout[] }) => {
  const grid = useMemo(() => heatmapGrid(workouts, 12, new Date()), [workouts])
  const total = grid.flat().filter((c) => !c.future).reduce((s, c) => s + c.count, 0)
  const cell = 13
  const gap = 3
  const W = grid.length * (cell + gap)
  const H = 7 * (cell + gap)
  const monthLabels = useMemo(
    () =>
      grid.map((col) => {
        const first = col[0].date
        const [y, m] = first.split('-')
        const label = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(
          new Date(Number(y), Number(m) - 1, 1),
        )
        return label
      }),
    [grid],
  )
  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Training heatmap: ${total} completed workouts over the last 12 weeks`}
      >
        {grid.map((col, ci) =>
          col.map((c, ri) => {
            if (c.future) return null
            const opacity = c.count === 0 ? 0.06 : Math.min(1, 0.35 + c.count * 0.3)
            return (
              <rect
                key={c.date}
                x={ci * (cell + gap)}
                y={ri * (cell + gap)}
                width={cell}
                height={cell}
                rx={3}
                fill="var(--color-pine)"
                opacity={opacity}
              />
            )
          }),
        )}
      </svg>
      <div className="flex justify-between mt-1" aria-hidden="true">
        {monthLabels.map((label, i) => (
          <span key={`${label}-${i}`} className="font-mono text-[9px] text-ink/40">
            {i % 2 === 0 ? label : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

const VolumeChart = ({ workouts }: { workouts: Workout[] }) => {
  const rows = useMemo(
    () =>
      volumeByPattern(workouts, (id) => exerciseById.get(id)?.pattern ?? null).slice(0, 8),
    [workouts],
  )
  if (rows.length === 0) {
    return <p className="text-sm text-ink/50">Complete a workout to see volume by pattern.</p>
  }
  const max = rows[0].sets
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.pattern} className="flex items-center gap-2">
          <span className="w-20 shrink-0 text-xs font-bold capitalize text-right">{r.pattern}</span>
          <span className="flex-1 h-5 rounded-md bg-ink/5 overflow-hidden">
            <span
              className="block h-full rounded-md bg-pine"
              style={{ width: `${Math.round((r.sets / max) * 100)}%` }}
            />
          </span>
          <span className="w-8 text-right font-mono text-xs text-ink/60">{r.sets}</span>
        </li>
      ))}
    </ul>
  )
}

const metricUnit = (m: 'reps' | 'hold-seconds' | 'level'): string =>
  m === 'reps' ? 'reps' : m === 'hold-seconds' ? 's' : ''

const PrTimeline = ({ workouts }: { workouts: Workout[] }) => {
  const events = useMemo(() => [...prTimeline(workouts)].reverse().slice(0, 12), [workouts])
  if (events.length === 0) {
    return <p className="text-sm text-ink/50">No PRs yet — they land here when you beat a best.</p>
  }
  return (
    <ol className="divide-y divide-ink/5">
      {events.map((e, i) => (
        <li key={`${e.exerciseId}-${e.date}-${i}`} className="py-2 flex items-baseline justify-between gap-2 text-sm">
          <span>
            <span className="font-bold">{e.name}</span>
            <span className="ml-2 text-xs text-ink/40 font-mono">{e.date}</span>
          </span>
          <span className="font-mono text-clay">
            {e.value}
            {metricUnit(e.metric)} {e.metric === 'reps' ? '' : e.metric === 'hold-seconds' ? 'hold' : 'level'}
          </span>
        </li>
      ))}
    </ol>
  )
}

const BadgeCabinet = ({ earnedIds }: { earnedIds: Set<string> }) => {
  const earnedCount = BADGES.filter((b) => earnedIds.has(b.id)).length
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-bold">Badge cabinet</h2>
        <Badge variant="pine">
          {earnedCount} / {BADGES.length}
        </Badge>
      </div>
      <ul className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {BADGES.map((b) => {
          const earned = earnedIds.has(b.id)
          const Icon = BADGE_ICONS[b.icon]
          return (
            <li key={b.id} className="flex flex-col items-center text-center">
              <span
                aria-hidden="true"
                className={`flex h-12 w-12 items-center justify-center rounded-[14px] border ${
                  earned ? 'bg-white' : 'bg-ink/[0.03] opacity-40'
                }`}
                style={{ borderColor: earned ? CATEGORY_COLOR[b.category] : 'var(--color-ink-10, rgba(32,36,31,0.1))' }}
              >
                {Icon ? (
                  <Icon size={20} color={earned ? CATEGORY_COLOR[b.category] : 'var(--color-ink)'} />
                ) : (
                  <span className="font-mono text-xs">{b.name.slice(0, 2)}</span>
                )}
              </span>
              <span
                className={`mt-1 text-[10px] leading-tight ${earned ? 'text-ink font-bold' : 'text-ink/40'}`}
                title={b.description}
              >
                {b.name}
              </span>
              <span className="sr-only">{earned ? 'Earned' : 'Not earned'}: {b.description}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export const Progress = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [level, setLevel] = useState<LevelInfo | null>(null)
  const [streak, setStreak] = useState<Streak | null>(null)
  const [earned, setEarned] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    Promise.all([
      workoutRepo.getAll().catch(() => [] as Workout[]),
      gamificationRepo.getLevel().catch(() => null),
      gamificationRepo.getStreak().catch(() => null),
      gamificationRepo
        .getAwards()
        .then((awards) => new Set(awards.map((a) => a.badgeId)))
        .catch(() => new Set<string>()),
    ])
      .then(([w, lv, st, aw]) => {
        if (cancelled) return
        setWorkouts(w)
        setLevel(lv)
        setStreak(st)
        setEarned(aw)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const completed = useMemo(() => workouts.filter((w) => w.completedAt), [workouts])
  const totalMinutes = completed.reduce((s, w) => s + w.durationSeconds, 0) / 60

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Progress</h1>
      <p className="text-sm text-ink/60 mb-4">Your training, measured.</p>

      <Card className="mb-4">
        <div className="flex items-center justify-around gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Ring
              value={level ? Math.min(level.xp, level.level * 1000) : 0}
              max={level ? level.level * 1000 : 1}
              size={72}
              color="var(--color-marigold)"
              label={`Level ${level?.level ?? 1} progress: ${level?.xp ?? 0} XP, ${level?.xpToNext ?? 1000} to next level`}
            />
            <div>
              <p className="font-mono text-xl font-bold text-marigold">{level?.xp ?? 0} XP</p>
              <p className="text-xs text-ink/50">
                Level {level?.level ?? 1} · {level?.rank ?? 'Recruit'}
              </p>
              <p className="text-[10px] text-ink/40 font-mono">{level?.xpToNext ?? 1000} to next</p>
            </div>
          </div>
          <div>
            <p className="font-mono text-xl font-bold text-clay">{streak?.current ?? 0}</p>
            <p className="text-xs text-ink/50">Day streak</p>
            <p className="text-[10px] text-ink/40 font-mono">best {streak?.best ?? 0}</p>
          </div>
          <div>
            <p className="font-mono text-xl font-bold text-pine">{completed.length}</p>
            <p className="text-xs text-ink/50">Workouts</p>
            <p className="text-[10px] text-ink/40 font-mono">{Math.round(totalMinutes)} min total</p>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="font-display text-lg font-bold mb-3">Last 12 weeks</h2>
        <Heatmap workouts={workouts} />
      </Card>

      <Card className="mb-4">
        <h2 className="font-display text-lg font-bold mb-3">Volume by pattern</h2>
        <VolumeChart workouts={workouts} />
      </Card>

      <Card className="mb-4">
        <h2 className="font-display text-lg font-bold mb-1">PR timeline</h2>
        <PrTimeline workouts={workouts} />
      </Card>

      <Card>
        <BadgeCabinet earnedIds={earned} />
      </Card>
    </div>
  )
}
