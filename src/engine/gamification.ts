/**
 * Gamification — XP, levels, badges, streaks, PR detection.
 * Pure deterministic logic.
 */

import { branded } from '../domain/ids'
import type { BadgeId } from '../domain/ids'
import { XP } from '../domain/gamification'
import type { Badge, LevelInfo, Streak, XpEvent } from '../domain/gamification'

export const RANKS: ReadonlyArray<string> = [
  'Recruit',
  'Private',
  'Corporal',
  'Sergeant',
  'Lieutenant',
  'Captain',
  'Major',
  'Colonel',
  'General',
  'Field Marshal',
]

export const XP_TABLE: Record<string, number> = {
  set: XP.set,
  workout: XP.workout,
  pr: XP.pr,
  flexibility: XP.flexibility,
  skill: XP.skill,
}

export function xpFor(event: XpEvent): number {
  return XP_TABLE[event.type]
}

export function levelForXP(totalXP: number): { level: number; xp: number; xpToNext: number } {
  const level = 1 + Math.floor(totalXP / 1000)
  return { level, xp: totalXP, xpToNext: level * 1000 - totalXP }
}

export function rankForLevel(level: number): string {
  return RANKS[Math.min(level - 1, RANKS.length - 1)]
}

export function levelInfo(totalXP: number): LevelInfo {
  const { level, xp, xpToNext } = levelForXP(totalXP)
  return { level, rank: rankForLevel(level) as LevelInfo['rank'], xp, xpToNext }
}

export type BestEffort = { reps?: number; holdSeconds?: number; level?: number }

export function isPR(
  metric: 'reps' | 'hold-seconds' | 'level',
  current: BestEffort,
  priorBest: BestEffort | null,
): boolean {
  if (!priorBest) return true
  switch (metric) {
    case 'reps':
      return (current.reps ?? 0) > (priorBest.reps ?? 0)
    case 'hold-seconds':
      return (current.holdSeconds ?? 0) > (priorBest.holdSeconds ?? 0)
    case 'level':
      return (current.level ?? 0) > (priorBest.level ?? 0)
    default:
      return false
  }
}

export function updateStreak(
  streak: Streak,
  completedDate: string,
): Streak {
  const last = streak.lastTrainingDate
  if (!last) {
    return { ...streak, current: 1, best: Math.max(1, streak.best), lastTrainingDate: completedDate }
  }
  if (last === completedDate) return streak
  const daysDiff = dateDiffDays(last, completedDate)
  if (daysDiff === 1) {
    return {
      ...streak,
      current: streak.current + 1,
      best: Math.max(streak.current + 1, streak.best),
      lastTrainingDate: completedDate,
    }
  }
  return {
    ...streak,
    current: 1,
    best: Math.max(1, streak.best),
    lastTrainingDate: completedDate,
  }
}

function dateDiffDays(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime()
  return Math.round(ms / 86400000)
}

export const BADGES: Badge[] = [
  { id: branded<BadgeId>('badge-first-workout'), name: 'First Steps', description: 'Complete your first workout.', icon: 'Triangle', category: 'workout', xpReward: 50 },
  { id: branded<BadgeId>('badge-week-streak'), name: 'Seven Days', description: 'Train 7 scheduled days in a row.', icon: 'Flame', category: 'streak', xpReward: 100 },
  { id: branded<BadgeId>('badge-month-streak'), name: 'Monthly Grind', description: 'Train 30 scheduled days in a row.', icon: 'Flame', category: 'streak', xpReward: 250 },
  { id: branded<BadgeId>('badge-pushup-pr'), name: 'Push-Up Pioneer', description: 'Set a push-up chain PR.', icon: 'Dumbbell', category: 'pr', xpReward: 40 },
  { id: branded<BadgeId>('badge-squat-pr'), name: 'Squat Scholar', description: 'Set a squat chain PR.', icon: 'Dumbbell', category: 'pr', xpReward: 40 },
  { id: branded<BadgeId>('badge-row-pr'), name: 'Row Ranger', description: 'Set a row chain PR.', icon: 'Dumbbell', category: 'pr', xpReward: 40 },
  { id: branded<BadgeId>('badge-hold-master'), name: 'Hold Master', description: 'Reach a 60-second hold.', icon: 'Clock', category: 'flexibility', xpReward: 60 },
  { id: branded<BadgeId>('badge-flexible'), name: 'Bendable', description: 'Level up a flexibility chain.', icon: 'Scroll', category: 'flexibility', xpReward: 60 },
  { id: branded<BadgeId>('badge-skill-unlock'), name: 'Skill Seeker', description: 'Unlock your first skill node.', icon: 'Star', category: 'skill', xpReward: 150 },
  { id: branded<BadgeId>('badge-handstand'), name: 'Inverted', description: 'Reach freestanding handstand step.', icon: 'Hand', category: 'skill', xpReward: 150 },
  { id: branded<BadgeId>('badge-planche'), name: 'Planche Path', description: 'Reach tuck planche.', icon: 'User', category: 'skill', xpReward: 150 },
  { id: branded<BadgeId>('badge-front-lever'), name: 'Leverage', description: 'Reach advanced tuck front lever.', icon: 'User', category: 'skill', xpReward: 150 },
  { id: branded<BadgeId>('badge-pistol'), name: 'Pistol Prospector', description: 'Complete a pistol squat.', icon: 'Leg', category: 'workout', xpReward: 150 },
  { id: branded<BadgeId>('badge-nordic'), name: 'Nordic Noble', description: 'Complete a Nordic hamstring curl.', icon: 'Leg', category: 'workout', xpReward: 150 },
  { id: branded<BadgeId>('badge-bridge'), name: 'Bridge Builder', description: 'Hold a full bridge.', icon: 'RotateCw', category: 'workout', xpReward: 150 },
  { id: branded<BadgeId>('badge-dragon-flag'), name: 'Flag Flyer', description: 'Hold a full dragon flag.', icon: 'Flag', category: 'workout', xpReward: 150 },
  { id: branded<BadgeId>('badge-protein'), name: 'Protein Priority', description: 'Hit protein target 7 days in a row.', icon: 'Egg', category: 'fuel', xpReward: 60 },
  { id: branded<BadgeId>('badge-water'), name: 'Hydrated', description: 'Hit water target 7 days in a row.', icon: 'Droplets', category: 'fuel', xpReward: 60 },
  { id: branded<BadgeId>('badge-weight-log'), name: 'Numbers Don’t Lie', description: 'Log 20 bodyweight entries.', icon: 'Scale', category: 'body', xpReward: 60 },
  { id: branded<BadgeId>('badge-photo'), name: 'Picture Progress', description: 'Take front/side/back progress photos.', icon: 'Image', category: 'body', xpReward: 60 },
  { id: branded<BadgeId>('badge-deload'), name: 'Recover', description: 'Complete a deload week.', icon: 'Moon', category: 'workout', xpReward: 50 },
  { id: branded<BadgeId>('badge-morning-limber'), name: 'Early Bird', description: 'Complete 5 Morning Limber sessions.', icon: 'Sun', category: 'flexibility', xpReward: 60 },
  { id: branded<BadgeId>('badge-consistent'), name: 'Consistent', description: 'Complete 20 workouts.', icon: 'CheckCircle2', category: 'workout', xpReward: 100 },
  { id: branded<BadgeId>('badge-level-10'), name: 'Veteran', description: 'Reach level 10.', icon: 'Award', category: 'streak', xpReward: 250 },
]

export const badgeById = new Map<BadgeId, Badge>(BADGES.map((b) => [b.id, b]))

export function evaluateBadges(
  earned: Set<BadgeId>,
  context: {
    workoutCount: number
    streakCurrent: number
    totalXP: number
    prCount: number
    skillUnlocks: number
    flexibilityLevelUps: number
    weightEntries: number
    photos: number
  },
): Badge[] {
  const newly: Badge[] = []
  for (const badge of BADGES) {
    if (earned.has(badge.id)) continue
    let award = false
    switch (badge.id) {
      case branded<BadgeId>('badge-first-workout'):
        award = context.workoutCount >= 1
        break
      case branded<BadgeId>('badge-week-streak'):
        award = context.streakCurrent >= 7
        break
      case branded<BadgeId>('badge-month-streak'):
        award = context.streakCurrent >= 30
        break
      case branded<BadgeId>('badge-consistent'):
        award = context.workoutCount >= 20
        break
      case branded<BadgeId>('badge-level-10'):
        award = context.totalXP >= 9000
        break
      case branded<BadgeId>('badge-weight-log'):
        award = context.weightEntries >= 20
        break
      case branded<BadgeId>('badge-photo'):
        award = context.photos >= 3
        break
      default:
        award = false
    }
    if (award) newly.push(badge)
  }
  return newly
}
