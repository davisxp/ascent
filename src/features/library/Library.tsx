/**
 * Library — searchable, filterable exercise list with a fixed-height
 * virtualized scroll window and a full detail dialog. Data comes from
 * the typed content seed (offline by construction).
 */

import { useMemo, useState } from 'react'
import { Badge, Button, Card, Input } from '../../ui/primitives'
import { useDialog } from '../../ui/useDialog'
import { allExercises } from '../../content/index'
import { chainById } from '../../content/index'
import { branded } from '../../domain/ids'
import type { ChainId } from '../../domain/ids'
import type { Exercise } from '../../domain/index'
import { filterExercises } from './filter'

const ROW_HEIGHT = 56
const VIEWPORT_HEIGHT = 432
const OVERSCAN = 6

const PATTERN_LABELS: Record<string, string> = {
  push: 'Push',
  pull: 'Pull',
  squat: 'Squat',
  hinge: 'Hinge',
  core: 'Core',
  'l-sit': 'L-sit',
  handstand: 'Handstand',
  planche: 'Planche',
  'front-lever': 'Front lever',
  bridge: 'Bridge',
  mobility: 'Mobility',
  flexibility: 'Flexibility',
}

const metricLabel = (metric: Exercise['metric']): string =>
  metric === 'hold-seconds' ? 'Hold' : metric === 'level' ? 'Level' : 'Reps'

export const Library = () => {
  const [query, setQuery] = useState('')
  const [pattern, setPattern] = useState<'all' | string>('all')
  const [scrollTop, setScrollTop] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(
    () => filterExercises(allExercises, query, pattern),
    [query, pattern],
  )

  const patterns = useMemo(() => {
    const seen = new Set(allExercises.map((e) => e.pattern))
    return [...seen].sort()
  }, [])

  const total = filtered.length
  const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT)
  const last = Math.min(total, first + visibleCount + OVERSCAN * 2)
  const rows = filtered.slice(first, last)

  const selected = selectedId
    ? allExercises.find((e) => e.id === selectedId) ?? null
    : null

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Library</h1>
      <p className="text-sm text-ink/60 mb-4">
        {total} of {allExercises.length} exercises
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, muscles, equipment…"
          aria-label="Search exercises"
          className="flex-1 h-11 rounded-[14px] px-4"
        />
        <select
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          aria-label="Filter by pattern"
          className="h-11 rounded-[14px] border border-ink/20 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
        >
          <option value="all">All patterns</option>
          {patterns.map((p) => (
            <option key={p} value={p}>
              {PATTERN_LABELS[p] ?? p}
            </option>
          ))}
        </select>
      </div>

      <Card className="p-0 overflow-hidden">
        <div
          className="overflow-y-auto"
          style={{ height: VIEWPORT_HEIGHT }}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        >
          {total === 0 ? (
            <p className="p-6 text-sm text-ink/50">No exercises match your search.</p>
          ) : (
            <div style={{ height: total * ROW_HEIGHT, position: 'relative' }}>
              {rows.map((ex, i) => (
                <button
                  key={ex.id}
                  onClick={() => setSelectedId(ex.id)}
                  aria-label={`${ex.name}, ${PATTERN_LABELS[ex.pattern] ?? ex.pattern}, difficulty ${ex.difficulty}`}
                  className="absolute left-0 right-0 flex items-center justify-between gap-3 px-4 border-b border-ink/5 text-left hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pine"
                  style={{ top: (first + i) * ROW_HEIGHT, height: ROW_HEIGHT }}
                >
                  <span className="font-bold text-sm truncate">{ex.name}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-ink/50">
                      {PATTERN_LABELS[ex.pattern] ?? ex.pattern}
                    </span>
                    <span className="font-mono text-xs text-ink/60">D{ex.difficulty}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {selected && <ExerciseDetailDialog exercise={selected} onClose={() => setSelectedId(null)} />}
    </div>
  )
}

const ExerciseDetailDialog = ({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) => {
  const { containerRef, handleKeyDown } = useDialog(onClose)
  const chain = exercise.chainId ? chainById.get(branded<ChainId>(exercise.chainId)) : undefined

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${exercise.name} details`}
      className="fixed inset-0 z-50 bg-ink/40 overflow-y-auto flex items-center justify-center p-4"
    >
      <Card
        ref={containerRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="max-w-md w-full"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="font-display text-lg font-bold">{exercise.name}</h2>
          <Button variant="ghost" onClick={onClose} aria-label="Close details" className="h-9 w-9 p-0">
            ✕
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="pine">Difficulty {exercise.difficulty}</Badge>
          <Badge variant="info">{metricLabel(exercise.metric)}</Badge>
          <Badge variant="warn">{PATTERN_LABELS[exercise.pattern] ?? exercise.pattern}</Badge>
          {exercise.barOnly && <Badge variant="danger">Bar only</Badge>}
        </div>
        {chain && (
          <p className="text-xs text-ink/50 mb-3">
            {chain.name} chain · step {exercise.step} of {chain.steps.length}
          </p>
        )}
        <p className="text-[11px] font-mono uppercase tracking-widest text-ink/40 mb-1">
          Equipment
        </p>
        <p className="text-sm text-ink/70 mb-3">{exercise.equipment.join(' · ')}</p>

        <Section title="Form cues" items={exercise.cues} />
        <Section title="Common mistakes" items={exercise.commonMistakes} />
        <Section title="Safety" items={exercise.safetyNotes} danger />
        <p className="text-xs text-ink/50 mt-2">Target: {exercise.targetMuscles.join(' · ')}</p>
      </Card>
    </div>
  )
}

const Section = ({ title, items, danger }: { title: string; items: string[]; danger?: boolean }) => (
  <div className="mb-3">
    <p className="text-[11px] font-mono uppercase tracking-widest text-ink/40 mb-1">{title}</p>
    <ul className={`list-disc pl-5 space-y-0.5 text-sm ${danger ? 'text-clay' : 'text-ink/70'}`}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  </div>
)
