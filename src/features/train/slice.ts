/**
 * Train zustand slice — active workout state.
 * Persistence goes through repositories; no Dexie calls here.
 * Registered via sliceRegistry in app/registrations.ts.
 */

import { generateWeek, whyWorkout } from '../../engine/planGenerator'
import { levelInfo, updateStreak, isPR } from '../../engine/gamification'
import { swapTarget } from '../../engine/swap'
import { XP } from '../../domain/gamification'
import { exerciseById, chainById } from '../../content/index'
import {
  WorkoutRepositoryImpl,
  DayPlanRepositoryImpl,
  GamificationRepositoryImpl,
  BodyRepositoryImpl,
  SettingsRepositoryImpl,
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
const settingsRepo = new SettingsRepositoryImpl()

const DEFAULT_REPS_RPE = branded<RPE>(5)

function findExercise(exerciseId: string) {
  return exerciseById.get(exerciseId)
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

export interface TrainState {
  weekPlan: WeekPlan | null
  weekStart: DateISO | null
  weekIndex: number
  activeWorkout: Workout | null
  activeDayIndex: number | null
  startedAt: number | null // epoch ms when the session started
  placements: Record<string, number>
  daysPerWeek: 2 | 3 | 4 | 5 | 6
  sessionLength: 20 | 30 | 45 | 60
  goal: 'strength' | 'skills' | 'flexibility' | 'balanced'
  barEnabled: boolean
  defaultRestSeconds: number
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
  quitWorkout: () => void
}

type SetState = Partial<TrainState> | ((prev: TrainState) => Partial<TrainState>)

export const createTrainSlice = (set: (partial: SetState) => void, get: () => TrainState): TrainState => {
  return {
    weekPlan: null,
    weekStart: null,
    weekIndex: 0,
    activeWorkout: null,
    activeDayIndex: null,
    startedAt: null,
    placements: {},
    daysPerWeek: 3,
    sessionLength: 45,
    goal: 'balanced',
    barEnabled: false,
    defaultRestSeconds: 60,
    totalXP: 0,
    level: { level: 1, rank: 'Recruit', xp: 0, xpToNext: 1000 },
    streak: { current: 0, best: 0 },
    isLoading: false,

    init: async () => {
      set({ isLoading: true })
      try {
        const settings = await settingsRepo.get()
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
        set({ totalXP, level, streak, defaultRestSeconds: settings.defaultRestSeconds })
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
      set({ weekPlan: { index: week.index, days: daysWithNames }, weekIndex })
    },

    startWorkout: async (dayIndex: number) => {
      const week = get().weekPlan
      if (!week) return
      const day = week.days[dayIndex]
      if (!day) return

      const exercises: ExerciseLog[] = day.exercises.map((ex) => {
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
        isDeload: week.index === 3,
        split: day.split,
        exercises,
        durationSeconds: 0,
        xpAwarded: 0,
        prs: [],
        why: whyWorkout(day, { goal: get().goal, deload: week.index === 3 }),
      }

      set({ activeWorkout: workout, activeDayIndex: dayIndex, startedAt: Date.now() })
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
      const startedAt = get().startedAt

      const previousWorkouts = await workoutRepo.getAll()
      const prs: ExerciseId[] = []
      let setXP = 0

      for (const ex of workout.exercises) {
        const completedSets = ex.sets.filter((s) => s.completed)
        setXP += completedSets.length * XP.set

        const exDef = findExercise(ex.exerciseId)
        const metric = exDef?.metric ?? 'reps'
        const priorBest = bestEffortForExercise(ex.exerciseId, previousWorkouts)

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
            prs.push(branded<ExerciseId>(ex.exerciseId))
          }
        }
      }

      const workoutXP = setXP + XP.workout + prs.length * XP.pr
      const newTotalXP = get().totalXP + workoutXP
      const newLevel = levelInfo(newTotalXP)
      const newStreak = updateStreak(get().streak, todayISO())

      const finishedWorkout: Workout = {
        ...workout,
        completedAt: todayISO(),
        durationSeconds:
          startedAt != null ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : 0,
        xpAwarded: workoutXP,
        prs,
      }

      await workoutRepo.save(finishedWorkout)
      await gamificationRepo.addXP(workoutXP)
      await gamificationRepo.saveLevel(newLevel)
      await gamificationRepo.saveStreak(newStreak)

      set({
        activeWorkout: null,
        activeDayIndex: null,
        startedAt: null,
        totalXP: newTotalXP,
        level: newLevel,
        streak: newStreak,
      })

      return finishedWorkout
    },

    swapExercise: async (exerciseId: string, direction: 'easier' | 'harder') => {
      const current = findExercise(exerciseId)
      if (!current?.chainId) return
      const chain = chainById.get(current.chainId)
      if (!chain) return

      // exercise.step is 1-based; chain.steps is a 0-based array.
      const currentStepIndex =
        current.step != null
          ? current.step - 1
          : chain.steps.findIndex((s) => s.exerciseId === exerciseId)
      if (currentStepIndex === -1) return

      const candidate = swapTarget(chain, currentStepIndex, direction, {
        barEnabled: get().barEnabled,
        getExercise: findExercise,
      })
      if (!candidate) return

      // 1. Move the chain placement and regenerate + persist the week.
      const placements = { ...get().placements, [current.chainId]: candidate.stepIndex }
      set({ placements })
      await get().generateWeek(get().weekIndex)

      // 2. Apply to the in-flight workout so the player shows the new move.
      const workout = get().activeWorkout
      if (!workout) return
      const exIdx = workout.exercises.findIndex((e) => e.exerciseId === exerciseId)
      if (exIdx === -1) return
      const old = workout.exercises[exIdx]
      const sets: SetLog[] = old.sets.map((_, i) => ({
        id: id(),
        exerciseId: candidate.exercise.id,
        rpe: DEFAULT_REPS_RPE,
        completed: false,
        order: i,
      }))
      const replacement: ExerciseLog = {
        exerciseId: candidate.exercise.id,
        name: candidate.exercise.name,
        metric: candidate.exercise.metric,
        sets,
      }
      const nextExercises = [...workout.exercises]
      nextExercises[exIdx] = replacement
      set({ activeWorkout: { ...workout, exercises: nextExercises } })
    },

    quitWorkout: () => {
      set({ activeWorkout: null, activeDayIndex: null, startedAt: null })
    },
  }
}

export type TrainSlice = TrainState
