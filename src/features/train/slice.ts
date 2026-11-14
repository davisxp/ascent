/**
 * Train zustand slice — active workout state.
 * Persistence goes through repositories; no Dexie calls here.
 * Registered via sliceRegistry in index.ts.
 */

import { generateWeek, whyWorkout } from '../../engine/planGenerator'
import { levelInfo, updateStreak, isPR } from '../../engine/gamification'
import { XP } from '../../domain/gamification'
import { exercises as allExercises, chainById } from '../../content/index'
import {
  WorkoutRepositoryImpl,
  DayPlanRepositoryImpl,
  GamificationRepositoryImpl,
  BodyRepositoryImpl,
} from '../../data/repositories'
import type {
  Workout,
  WeekPlan,
  SetLog,
  ExerciseLog,
  LevelInfo,
  Streak,
  ExerciseId,
  DateISO,
  RPE,
} from '../../domain/index'
import { id, todayISO, branded } from '../../domain/ids'

const workoutRepo = new WorkoutRepositoryImpl()
const dayPlanRepo = new DayPlanRepositoryImpl()
const gamificationRepo = new GamificationRepositoryImpl()
const bodyRepo = new BodyRepositoryImpl()

const DEFAULT_REPS_RPE = branded<RPE>(5)

function findExercise(exerciseId: string) {
  return allExercises.find((e) => e.id === exerciseId)
}

function bestEffortForExercise(
  exerciseId: string,
  workouts: Workout[],
): { reps?: number; holdSeconds?: number; level?: number } | null {
  let best: { reps?: number; holdSeconds?: number; level?: number } | null = null
  for (const w of workouts) {
    for (const ex of w.exercises) {
      if (ex.exerciseId !== exerciseId) continue
      for (const set of ex.sets) {
        if (!set.completed) continue
        const candidate: { reps?: number; holdSeconds?: number; level?: number } = {
          reps: set.reps,
          holdSeconds: set.holdSeconds,
          level: set.level,
        }
        if (!best) {
          best = candidate
          continue
        }
        const exDef = findExercise(exerciseId)
        const metric = exDef?.metric ?? 'reps'
        if (metric === 'reps' && (set.reps ?? 0) > (best.reps ?? 0)) best = candidate
        else if (metric === 'hold-seconds' && (set.holdSeconds ?? 0) > (best.holdSeconds ?? 0)) best = candidate
        else if (metric === 'level' && (set.level ?? 0) > (best.level ?? 0)) best = candidate
      }
    }
  }
  return best
}

interface TrainState {
  weekPlan: WeekPlan | null
  weekStart: DateISO | null
  activeWorkout: Workout | null
  activeDayIndex: number | null
  placements: Record<string, number>
  daysPerWeek: 2 | 3 | 4 | 5 | 6
  sessionLength: 20 | 30 | 45 | 60
  goal: 'strength' | 'skills' | 'flexibility' | 'balanced'
  barEnabled: boolean
  totalXP: number
  level: LevelInfo
  streak: Streak
  isLoading: boolean

  init: () => Promise<void>
  generateWeek: (weekIndex?: number) => Promise<void>
  startWorkout: (dayIndex: number) => Promise<void>
  updateSet: (exerciseId: string, setIndex: number, updates: Partial<SetLog>) => void
  completeWorkout: () => Promise<Workout>
  swapExercise: (exerciseId: string, direction: 'easier' | 'harder') => Promise<void>
}

type SetState = Partial<TrainState> | ((prev: TrainState) => Partial<TrainState>)

export const createTrainSlice = (set: (partial: SetState) => void, get: () => TrainState): TrainState => {
  return {
    weekPlan: null,
    weekStart: null,
    activeWorkout: null,
    activeDayIndex: null,
    placements: {},
    daysPerWeek: 3,
    sessionLength: 45,
    goal: 'balanced',
    barEnabled: false,
    totalXP: 0,
    level: { level: 1, rank: 'Recruit', xp: 0, xpToNext: 1000 },
    streak: { current: 0, best: 0 },
    isLoading: false,

    init: async () => {
      set({ isLoading: true })
      try {
        const profile = await bodyRepo.getProfile()
        if (profile) {
          set({
            daysPerWeek: profile.daysPerWeek,
            sessionLength: profile.sessionLength,
            goal: profile.goal,
            barEnabled: profile.barEnabled,
          })
        }
        const totalXP = await gamificationRepo.getTotalXP()
        const level = levelInfo(totalXP)
        const streak = await gamificationRepo.getStreak()
        set({ totalXP, level, streak })
        await get().generateWeek(0)
      } finally {
        set({ isLoading: false })
      }
    },

    generateWeek: async (weekIndex = 0) => {
      const { placements, daysPerWeek, sessionLength, goal, barEnabled } = get()
      const startDate = todayISO()
      set({ weekStart: startDate })

      const placementsMap = new Map<string, number>()
      for (const [cid, step] of Object.entries(placements)) {
        placementsMap.set(cid, step)
      }

      const week = generateWeek({
        placements: placementsMap,
        daysPerWeek,
        sessionLength,
        goal,
        barEnabled,
        weekIndex,
      })

      const daysWithNames = week.days.map((day) => ({
        ...day,
        exercises: day.exercises.map((ex) => {
          const def = findExercise(ex.exerciseId)
          return {
            ...ex,
            name: def?.name ?? ex.name,
            metric: (def?.metric ?? 'reps') as 'reps' | 'hold-seconds' | 'level',
          }
        }),
      }))

      await dayPlanRepo.saveWeek(startDate, daysWithNames)
      set({ weekPlan: { index: week.index, days: daysWithNames } })
    },

    startWorkout: async (dayIndex: number) => {
      const week = get().weekPlan
      if (!week) return
      const day = week.days[dayIndex]
      if (!day) return

      const exercises: ExerciseLog[] = day.exercises.map((ex: { exerciseId: ExerciseId; name: string; metric: 'reps' | 'hold-seconds' | 'level'; targetSets: number; targetReps?: [number, number]; targetHoldSeconds?: number; restSeconds: number; rpeCap: RPE }) => {
        const sets: SetLog[] = []
        for (let i = 0; i < ex.targetSets; i++) {
          sets.push({
            id: id(),
            exerciseId: ex.exerciseId,
            rpe: DEFAULT_REPS_RPE,
            completed: false,
            order: i,
          })
        }
        return {
          exerciseId: ex.exerciseId,
          name: ex.name,
          metric: ex.metric,
          sets,
        }
      })

      const workout: Workout = {
        id: id(),
        date: day.date,
        dayIndex,
        weekIndex: week.index,
        mesocycleIndex: 0,
        isDeload: false,
        split: day.split,
        exercises,
        durationSeconds: 0,
        xpAwarded: 0,
        prs: [],
        why: whyWorkout(day, { goal: get().goal, deload: false }),
      }

      set({ activeWorkout: workout, activeDayIndex: dayIndex })
    },

    updateSet: (exerciseId: string, setIndex: number, updates: Partial<SetLog>) => {
      const workout = get().activeWorkout
      if (!workout) return
      const exIdx = workout.exercises.findIndex((e) => e.exerciseId === exerciseId)
      if (exIdx === -1) return
      const ex = workout.exercises[exIdx]
      if (setIndex < 0 || setIndex >= ex.sets.length) return
      const next = { ...ex.sets[setIndex], ...updates }
      const nextSets = [...ex.sets]
      nextSets[setIndex] = next
      const nextExercises = [...workout.exercises]
      nextExercises[exIdx] = { ...ex, sets: nextSets }
      set({ activeWorkout: { ...workout, exercises: nextExercises } })
    },

    completeWorkout: async () => {
      const workout = get().activeWorkout
      if (!workout) throw new Error('No active workout')

      const previousWorkouts = await workoutRepo.getAll()
      const prs: ExerciseId[] = []
      let setXP = 0

      const completedExercises: ExerciseLog[] = []
      for (const ex of workout.exercises) {
        const completedSets = ex.sets.filter((s) => s.completed)
        setXP += completedSets.length * XP.set

        const exDef = findExercise(ex.exerciseId)
        const metric = exDef?.metric ?? 'reps'
        const priorBest = bestEffortForExercise(ex.exerciseId, previousWorkouts)

        // exercisePR removed (unused)
        if (completedSets.length > 0) {
          let currentBest: { reps?: number; holdSeconds?: number; level?: number } | null = null
          for (const s of completedSets) {
            const candidate = { reps: s.reps, holdSeconds: s.holdSeconds, level: s.level }
            if (!currentBest) {
              currentBest = candidate
            } else {
              if (metric === 'reps' && (s.reps ?? 0) > (currentBest.reps ?? 0)) currentBest = candidate
              else if (metric === 'hold-seconds' && (s.holdSeconds ?? 0) > (currentBest.holdSeconds ?? 0)) currentBest = candidate
              else if (metric === 'level' && (s.level ?? 0) > (currentBest.level ?? 0)) currentBest = candidate
            }
          }
          if (currentBest && isPR(metric, currentBest, priorBest ?? null)) {
            // removed
            prs.push(branded<ExerciseId>(ex.exerciseId))
          }
        }

        completedExercises.push({ ...ex, sets: ex.sets })
      }

      const workoutXP = setXP + XP.workout + prs.length * XP.pr
      const newTotalXP = get().totalXP + workoutXP
      const newLevel = levelInfo(newTotalXP)
      const newStreak = updateStreak(get().streak, todayISO())

      const finishedWorkout: Workout = {
        ...workout,
        exercises: completedExercises,
        completedAt: todayISO(),
        durationSeconds: 0,
        xpAwarded: workoutXP,
        prs,
        why: workout.why,
      }

      await workoutRepo.save(finishedWorkout)
      await gamificationRepo.addXP(workoutXP)
      await gamificationRepo.saveLevel(newLevel)
      await gamificationRepo.saveStreak(newStreak)

      set({
        activeWorkout: null,
        activeDayIndex: null,
        totalXP: newTotalXP,
        level: newLevel,
        streak: newStreak,
      })

      return finishedWorkout
    },

    swapExercise: async (exerciseId: string, direction: 'easier' | 'harder') => {
      const current = findExercise(exerciseId)
      if (!current) return
      const chain = current.chainId ? chainById.get(current.chainId) : undefined
      if (!chain) return

      const currentStepIndex = chain.steps.findIndex((s) => s.exerciseId === exerciseId)
      if (currentStepIndex === -1) return

      let targetStepIndex: number
      if (direction === 'easier') {
        targetStepIndex = Math.max(0, currentStepIndex - 1)
      } else {
        targetStepIndex = Math.min(chain.steps.length - 1, currentStepIndex + 1)
      }

      const targetExerciseId = chain.steps[targetStepIndex].exerciseId
      const target = findExercise(targetExerciseId)
      if (!target) return

      if (target.pattern !== current.pattern) return

      if (Math.abs(target.difficulty - current.difficulty) > 1) return

      const placements = { ...get().placements }
      placements[current.chainId ?? ''] = targetStepIndex
      set({ placements })
    },
  }
}

export type TrainSlice = ReturnType<typeof createTrainSlice>
