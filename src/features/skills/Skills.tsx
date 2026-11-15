/**
 * Skills — interactive SVG skill trees for each progression chain.
 * Unlock state comes from logged workout history via the skill-tree
 * engine; nodes are clickable in the SVG and mirrored in an accessible
 * step list. Mobility chains show hold progress instead of trees.
 */

import { useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Badge, Button, Card } from '../../ui/primitives'
import { useDialog } from '../../ui/useDialog'
import { chains, chainById, mobilityChainById, exerciseById } from '../../content/index'
import { buildSkillTree } from '../../engine/skillTree'
import { WorkoutRepositoryImpl } from '../../data/repositories'
import { branded } from '../../domain/ids'
import type { ChainId } from '../../domain/ids'
import type { Chain, Exercise, Workout } from '../../domain/index'
import type { SkillTree } from '../../engine/skillTree'

const workoutRepo = new WorkoutRepositoryImpl()

const metricUnit = (metric: Exercise['metric']): string =>
  metric === 'hold-seconds' ? 's' : metric === 'level' ? ' lvl' : ' reps'

const nodeColors = {
  current: { fill: 'var(--color-marigold)', text: 'var(--color-ink)' },
  unlocked: { fill: 'var(--color-pine)', text: '#FFFFFF' },
  locked: { fill: 'var(--color-paper)', text: 'var(--color-ink-soft)' },
} as const

const NODE_SPACING = 68
const NODE_RADIUS = 18
const FIRST_NODE_Y = 40
const SVG_WIDTH = 380

const TreeSvg = ({
  tree,
  selectedIndex,
  onSelect,
}: {
  tree: SkillTree
  selectedIndex: number
  onSelect: (stepIndex: number) => void
}) => {
  const height = FIRST_NODE_Y + (tree.nodes.length - 1) * NODE_SPACING + NODE_RADIUS + 12

  const labelFor = (node: SkillTree['nodes'][number]): string => {
    const name = node.exercise?.name ?? `Step ${node.step}`
    if (node.state === 'locked') {
      const unmet = node.criteria.find((c) => !c.met)
      if (unmet) {
        const cName = exerciseById.get(unmet.criterion.exerciseId)?.name ?? 'previous step'
        return `Step ${node.step}, ${name}, locked — needs ${unmet.criterion.value}${metricUnit(unmet.criterion.metric)} on ${cName}`
      }
      return `Step ${node.step}, ${name}, locked`
    }
    return `Step ${node.step}, ${name}, ${node.state === 'current' ? 'current step' : 'unlocked'}`
  }

  const handleNodeKey = (e: ReactKeyboardEvent<SVGGElement>, stepIndex: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(stepIndex)
    }
  }

  return (
    <svg
      viewBox={`0 0 ${SVG_WIDTH} ${height}`}
      className="w-full"
      role="group"
      aria-label={`${tree.chainName} skill tree — ${tree.unlockedCount} of ${tree.nodes.length} steps unlocked`}
    >
      {/* connectors */}
      {tree.nodes.slice(0, -1).map((node, i) => {
        const y1 = FIRST_NODE_Y + i * NODE_SPACING + NODE_RADIUS
        const y2 = FIRST_NODE_Y + (i + 1) * NODE_SPACING - NODE_RADIUS
        const next = tree.nodes[i + 1]
        const open = next.state !== 'locked'
        return (
          <line
            key={node.step}
            x1={32}
            y1={y1}
            x2={32}
            y2={y2}
            stroke={open ? 'var(--color-pine)' : 'var(--color-border)'}
            strokeWidth={3}
            strokeDasharray={open ? undefined : '4 6'}
          />
        )
      })}

      {/* nodes */}
      {tree.nodes.map((node, i) => {
        const cy = FIRST_NODE_Y + i * NODE_SPACING
        const colors = nodeColors[node.state]
        const selected = i === selectedIndex
        const name = node.exercise?.name ?? `Step ${node.step}`
        const best =
          node.criteria.length > 0
            ? node.criteria.map((c) => c.best).find((b) => b !== null) ?? null
            : null
        const sub =
          node.state === 'locked'
            ? (() => {
                const unmet = node.criteria.find((c) => !c.met)
                if (!unmet) return 'Locked'
                const cName = exerciseById.get(unmet.criterion.exerciseId)?.name ?? ''
                return `Locked — ${unmet.best === null ? 0 : unmet.best}/${unmet.criterion.value}${metricUnit(unmet.criterion.metric)} ${cName}`
              })()
            : node.state === 'current'
              ? 'Current step'
              : best !== null
                ? `Best ${best}${metricUnit(node.exercise?.metric ?? 'reps')}`
                : 'Unlocked'
        return (
          <g
            key={node.step}
            role="button"
            tabIndex={0}
            aria-label={labelFor(node)}
            onClick={() => onSelect(i)}
            onKeyDown={(e) => handleNodeKey(e, i)}
            style={{ cursor: 'pointer' }}
          >
            {selected && (
              <circle
                cx={32}
                cy={cy}
                r={NODE_RADIUS + 5}
                fill="none"
                stroke="var(--color-pine-soft)"
                strokeWidth={2}
              />
            )}
            <circle
              cx={32}
              cy={cy}
              r={NODE_RADIUS}
              fill={colors.fill}
              stroke={node.state === 'locked' ? 'var(--color-border)' : 'none'}
              strokeWidth={node.state === 'locked' ? 2 : 0}
              strokeDasharray={node.state === 'locked' ? '4 4' : undefined}
            />
            <text
              x={32}
              y={cy + 4}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize={13}
              fontWeight={700}
              fill={colors.text}
            >
              {node.step}
            </text>
            <text x={62} y={cy - 2} fontSize={14} fontWeight={700} fill="var(--color-ink)">
              {name}
            </text>
            <text
              x={62}
              y={cy + 15}
              fontSize={11}
              fill={node.state === 'locked' ? 'var(--color-ink-soft)' : 'var(--color-pine)'}
            >
              {sub}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export const Skills = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [selectedChainId, setSelectedChainId] = useState<string>('chain-pushup')
  const [selection, setSelection] = useState<{ chainId: string; stepIndex: number } | null>(null)
  const [detail, setDetail] = useState<{ chainId: string; stepIndex: number } | null>(null)

  useEffect(() => {
    workoutRepo
      .getAll()
      .then(setWorkouts)
      .catch(() => setWorkouts([]))
  }, [])

  const lookup = useMemo(() => (id: string) => exerciseById.get(id), [])

  const allTrees = useMemo(
    () => chains.map((c) => buildSkillTree(c, workouts, lookup)),
    [workouts, lookup],
  )

  const selectedChain: Chain | undefined = chainById.get(branded<ChainId>(selectedChainId))
  const tree = useMemo(
    () => (selectedChain ? buildSkillTree(selectedChain, workouts, lookup) : null),
    [selectedChain, workouts, lookup],
  )

  const frontierIndex = useMemo(() => {
    if (!tree) return 0
    const idx = tree.nodes.findIndex((n) => n.state === 'current')
    return idx === -1 ? 0 : idx
  }, [tree])

  const selectedIndex =
    selection && selection.chainId === selectedChainId ? selection.stepIndex : frontierIndex

  const totalSteps = allTrees.reduce((n, t) => n + t.nodes.length, 0)
  const totalUnlocked = allTrees.reduce((n, t) => n + t.unlockedCount, 0)

  const selectedNode = tree?.nodes[selectedIndex]
  const detailNode = detail && detail.chainId === selectedChainId ? tree?.nodes[detail.stepIndex] : undefined

  const mobilityEntries = useMemo(() => {
    return [...mobilityChainById.values()].map((ex) => ({
      exercise: ex,
      best:
        ex.metric === 'hold-seconds'
          ? bestHoldFor(workouts, ex.id)
          : bestRepsFor(workouts, ex.id),
    }))
  }, [workouts])

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-2xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Skills</h1>
          <p className="text-sm text-ink/60">
            Hit the criteria to unlock the next step of each chain.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono text-lg font-bold text-pine">
            {totalUnlocked}/{totalSteps}
          </p>
          <p className="text-xs text-ink/50">steps unlocked</p>
        </div>
      </div>

      {/* chain selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4" aria-label="Chains">
        {allTrees.map((t) => {
          const active = t.chainId === selectedChainId
          return (
            <button
              key={t.chainId}
              aria-pressed={active}
              onClick={() => {
                setSelectedChainId(t.chainId)
                setSelection(null)
              }}
              className={`shrink-0 h-11 px-3 rounded-[14px] border text-sm whitespace-nowrap ${
                active
                  ? 'bg-pine text-white border-pine'
                  : 'bg-white text-ink border-ink/15 hover:bg-ink/5'
              }`}
            >
              {t.chainName}
              <span className="ml-1 font-mono text-xs opacity-70">
                {t.unlockedCount}/{t.nodes.length}
              </span>
            </button>
          )
        })}
      </div>

      {/* tree + step list */}
      {tree && (
        <Card>
          <h2 className="font-display text-lg font-bold mb-1">{tree.chainName}</h2>
          <p className="text-xs text-ink/40 font-mono uppercase tracking-widest mb-3">
            {tree.unlockedCount} of {tree.nodes.length} steps unlocked
          </p>
          <TreeSvg tree={tree} selectedIndex={selectedIndex} onSelect={(i) => setSelection({ chainId: selectedChainId, stepIndex: i })} />

          {/* accessible step list (mirrors the SVG nodes) */}
          <ul className="mt-2 space-y-1" aria-label={`${tree.chainName} steps`}>
            {tree.nodes.map((node, i) => (
              <li key={node.step}>
                <Button
                  variant={i === selectedIndex ? 'primary' : 'ghost'}
                  className="w-full justify-start text-left h-11 px-3"
                  aria-label={`Step ${node.step}: ${node.exercise?.name ?? ''} (${node.state})`}
                  onClick={() => setSelection({ chainId: selectedChainId, stepIndex: i })}
                >
                  {node.step}. {node.exercise?.name ?? node.criteria[0]?.criterion.exerciseId ?? 'Step'}
                  <span className="ml-auto text-xs opacity-70">
                    {node.state === 'locked' ? 'Locked' : node.state === 'current' ? 'Current' : 'Unlocked'}
                  </span>
                </Button>
              </li>
            ))}
          </ul>

          {/* selected node detail */}
          {selectedNode && (
            <div className="border-t border-ink/10 mt-4 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-bold">
                    {selectedNode.exercise?.name ?? `Step ${selectedNode.step}`}
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedNode.exercise && (
                      <Badge variant="pine">Difficulty {selectedNode.exercise.difficulty}</Badge>
                    )}
                    <Badge variant={selectedNode.state === 'locked' ? 'danger' : selectedNode.state === 'current' ? 'warn' : 'success'}>
                      {selectedNode.state === 'locked'
                        ? 'Locked'
                        : selectedNode.state === 'current'
                          ? 'Current step'
                          : 'Unlocked'}
                    </Badge>
                  </div>
                </div>
                <Button variant="outline" className="h-11 px-4" onClick={() => setDetail({ chainId: selectedChainId, stepIndex: selectedIndex })}>
                  Details
                </Button>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {selectedNode.criteria.map((c) => (
                  <li key={`${c.criterion.exerciseId}-${c.criterion.metric}-${c.criterion.value}`} className="flex justify-between gap-2">
                    <span className="text-ink/60">
                      {exerciseById.get(c.criterion.exerciseId)?.name ?? 'Exercise'}:{' '}
                      {c.criterion.value}
                      {metricUnit(c.criterion.metric)}
                    </span>
                    <span className={`font-mono ${c.met ? 'text-pine' : 'text-ink/50'}`}>
                      {c.best === null ? 'not logged' : `${c.best}${metricUnit(c.criterion.metric)}`}
                      {c.met ? ' ✓' : ''}
                    </span>
                  </li>
                ))}
                {selectedNode.criteria.length === 0 && (
                  <li className="text-ink/60 text-sm">Entry step — always unlocked.</li>
                )}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* mobility progress */}
      <h2 className="font-display text-xl font-bold mt-8 mb-3">Mobility</h2>
      <ul className="divide-y divide-ink/10">
        {mobilityEntries.map(({ exercise, best }) => (
          <li key={exercise.id} className="py-3">
            <p className="font-display text-base font-bold leading-tight">{exercise.name}</p>
            <div className="flex flex-wrap gap-2 mt-1 mb-1">
              <Badge variant="pine">Difficulty {exercise.difficulty}</Badge>
              <Badge variant="info">Hold</Badge>
            </div>
            <p className="text-sm text-ink/60">
              {best === null ? 'Not logged yet' : `Best hold: ${best}s`}
            </p>
          </li>
        ))}
      </ul>

      {/* detail dialog */}
      {detailNode && detail && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Exercise details"
          className="fixed inset-0 z-50 bg-ink/40 overflow-y-auto flex items-center justify-center p-4"
        >
          <ExerciseDetail exercise={detailNode.exercise} onClose={() => setDetail(null)} />
        </div>
      )}
    </div>
  )
}

const ExerciseDetail = ({ exercise, onClose }: { exercise: Exercise | undefined; onClose: () => void }) => {
  const { containerRef, handleKeyDown } = useDialog(onClose)

  if (!exercise) {
    return (
      <Card ref={containerRef} tabIndex={-1} onKeyDown={handleKeyDown} className="max-w-md w-full">
        <p className="text-sm text-ink/60 mb-3">Exercise data unavailable.</p>
        <Button variant="outline" onClick={onClose} className="h-11 px-4">
          Close
        </Button>
      </Card>
    )
  }

  return (
    <Card
      ref={containerRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label={`${exercise.name} details`}
      className="max-w-md w-full"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-display text-lg font-bold">{exercise.name}</h3>
        <Button variant="ghost" onClick={onClose} aria-label="Close details" className="h-9 w-9 p-0">
          ✕
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant="pine">Difficulty {exercise.difficulty}</Badge>
        <Badge variant="info">{exercise.pattern}</Badge>
        {exercise.barOnly && <Badge variant="warn">Bar only</Badge>}
      </div>
      <Section title="Form cues" items={exercise.cues} />
      <Section title="Common mistakes" items={exercise.commonMistakes} />
      <Section title="Safety" items={exercise.safetyNotes} danger />
      <p className="text-xs text-ink/50 mt-3">Target: {exercise.targetMuscles.join(' · ')}</p>
    </Card>
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

function bestHoldFor(workouts: Workout[], exerciseId: string): number | null {
  let best: number | null = null
  for (const w of workouts) {
    for (const ex of w.exercises) {
      if (ex.exerciseId !== exerciseId) continue
      for (const s of ex.sets) {
        if (s.completed && s.holdSeconds != null && (best === null || s.holdSeconds > best)) {
          best = s.holdSeconds
        }
      }
    }
  }
  return best
}

function bestRepsFor(workouts: Workout[], exerciseId: string): number | null {
  let best: number | null = null
  for (const w of workouts) {
    for (const ex of w.exercises) {
      if (ex.exerciseId !== exerciseId) continue
      for (const s of ex.sets) {
        if (s.completed && s.reps != null && (best === null || s.reps > best)) {
          best = s.reps
        }
      }
    }
  }
  return best
}
