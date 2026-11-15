/**
 * Skill-tree engine tests — unlock states from workout history.
 */

import { describe, expect, it } from 'vitest'
import { bestForMetric, buildSkillTree } from '../../src/engine/skillTree'
import { exerciseById, chainById } from '../../src/content/index'
import { branded } from '../../src/domain/ids'
import type { ChainId, ExerciseId, RPE, SetId, WorkoutId } from '../../src/domain/ids'
import type { Exercise, Chain } from '../../src/domain/index'
import type { Workout } from '../../src/domain/workout'

const byId = (id: string): Exercise | undefined => exerciseById.get(id)
const pushupChain = (): Chain => chainById.get(branded<ChainId>('chain-pushup')) as Chain

let setCounter = 0
function logSet(exerciseId: string, metric: 'reps' | 'hold-seconds' | 'level', value: number) {
  setCounter += 1
  return {
    id: branded<SetId>(`set-${setCounter}`),
    exerciseId: branded<ExerciseId>(exerciseId),
    reps: metric === 'reps' ? value : undefined,
    holdSeconds: metric === 'hold-seconds' ? value : undefined,
    level: metric === 'level' ? value : undefined,
    rpe: branded<RPE>(7),
    completed: true,
    order: 0,
  }
}

function workoutWith(sets: ReturnType<typeof logSet>[]): Workout {
  const byExercise = new Map<string, typeof sets>()
  for (const s of sets) {
    const arr = byExercise.get(s.exerciseId) ?? []
    arr.push(s)
    byExercise.set(s.exerciseId, arr)
  }
  return {
    id: branded<WorkoutId>(`w-${setCounter}`),
    date: branded<never>('2026-11-15'),
    dayIndex: 0,
    weekIndex: 0,
    mesocycleIndex: 0,
    isDeload: false,
    split: 'full-body',
    durationSeconds: 600,
    xpAwarded: 0,
    prs: [],
    why: '',
    exercises: [...byExercise.entries()].map(([exerciseId, exSets]) => ({
      exerciseId: branded<ExerciseId>(exerciseId),
      name: byId(exerciseId)?.name ?? exerciseId,
      metric: (exSets[0].reps != null ? 'reps' : exSets[0].holdSeconds != null ? 'hold-seconds' : 'level') as
        | 'reps'
        | 'hold-seconds'
        | 'level',
      sets: exSets,
    })),
  }
}

describe('bestForMetric', () => {
  it('returns the max completed value for the metric', () => {
    const w = workoutWith([logSet('ex-pushup-wall', 'reps', 10), logSet('ex-pushup-wall', 'reps', 16)])
    expect(bestForMetric([w], 'ex-pushup-wall', 'reps')).toBe(16)
  })

  it('ignores uncompleted sets and other metrics', () => {
    const w = workoutWith([logSet('ex-pushup-wall', 'reps', 12)])
    w.exercises[0].sets[0].completed = false
    expect(bestForMetric([w], 'ex-pushup-wall', 'reps')).toBeNull()
  })

  it('returns null when the exercise was never logged', () => {
    expect(bestForMetric([], 'ex-pushup-wall', 'reps')).toBeNull()
  })
})

describe('buildSkillTree', () => {
  it('with no history: entry step is current, the rest locked', () => {
    const tree = buildSkillTree(pushupChain(), [], byId)
    expect(tree.nodes[0].state).toBe('current')
    for (const node of tree.nodes.slice(1)) {
      expect(node.state).toBe('locked')
    }
    expect(tree.unlockedCount).toBe(1)
    expect(tree.chainId).toBe('chain-pushup')
  })

  it('meeting a criterion unlocks the next step as current', () => {
    // Step 2 requires 15 reps on the wall push-up (step 1).
    const w = workoutWith([logSet('ex-pushup-wall', 'reps', 15)])
    const tree = buildSkillTree(pushupChain(), [w], byId)
    expect(tree.nodes[0].state).toBe('unlocked')
    expect(tree.nodes[1].state).toBe('current')
    expect(tree.nodes[2].state).toBe('locked')
    expect(tree.unlockedCount).toBe(2)
  })

  it('below the required value keeps the next step locked', () => {
    const w = workoutWith([logSet('ex-pushup-wall', 'reps', 14)])
    const tree = buildSkillTree(pushupChain(), [w], byId)
    expect(tree.nodes[0].state).toBe('current')
    expect(tree.nodes[1].state).toBe('locked')
    expect(tree.unlockedCount).toBe(1)
  })

  it('carries progress: best value is exposed per criterion', () => {
    const w = workoutWith([logSet('ex-pushup-wall', 'reps', 10)])
    const tree = buildSkillTree(pushupChain(), [w], byId)
    const node1 = tree.nodes[1]
    expect(node1.criteria[0].best).toBe(10)
    expect(node1.criteria[0].met).toBe(false)
    expect(node1.criteria[0].criterion.value).toBe(15)
  })

  it('multiple met nodes: the last met is current, earlier ones unlocked', () => {
    const w = workoutWith([
      logSet('ex-pushup-wall', 'reps', 20),
      logSet('ex-pushup-incline', 'reps', 15),
      logSet('ex-pushup-knee', 'reps', 15),
    ])
    const tree = buildSkillTree(pushupChain(), [w], byId)
    expect(tree.nodes[0].state).toBe('unlocked')
    expect(tree.nodes[1].state).toBe('unlocked')
    expect(tree.nodes[2].state).toBe('unlocked')
    expect(tree.nodes[3].state).toBe('current')
    expect(tree.unlockedCount).toBe(4)
  })

  it('handles hold-seconds criteria (front lever chain)', () => {
    const fl = chainById.get(branded<ChainId>('chain-front-lever')) as Chain
    const first = fl.steps[0].exerciseId
    const criterion = fl.steps[1].unlockCriteria[0]
    const w = workoutWith([logSet(first, criterion.metric, criterion.value)])
    const tree = buildSkillTree(fl, [w], byId)
    expect(tree.nodes[1].state).toBe('current')
    expect(tree.unlockedCount).toBe(2)
  })

  it('aggregates bests across multiple workouts', () => {
    const w1 = workoutWith([logSet('ex-pushup-wall', 'reps', 8)])
    const w2 = workoutWith([logSet('ex-pushup-wall', 'reps', 15)])
    const tree = buildSkillTree(pushupChain(), [w1, w2], byId)
    expect(tree.nodes[1].state).toBe('current')
    expect(tree.nodes[1].criteria[0].best).toBe(15)
  })

  it('is deterministic for identical inputs', () => {
    const w = workoutWith([logSet('ex-pushup-wall', 'reps', 15)])
    const a = buildSkillTree(pushupChain(), [w], byId)
    const b = buildSkillTree(pushupChain(), [w], byId)
    expect(a).toEqual(b)
  })
})
