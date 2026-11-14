/**
 * Gamification domain types — XP, levels, badges, streaks.
 */

import type { BadgeId } from './ids'

export type RankTitle =
  | 'Recruit'
  | 'Private'
  | 'Corporal'
  | 'Sergeant'
  | 'Lieutenant'
  | 'Captain'
  | 'Major'
  | 'Colonel'
  | 'General'
  | 'Field Marshal'

export type LevelInfo = {
  level: number
  rank: RankTitle
  xp: number
  xpToNext: number
}

export type Badge = {
  id: BadgeId
  name: string
  description: string
  icon: string // lucide icon name
  category: 'workout' | 'pr' | 'flexibility' | 'skill' | 'streak' | 'body' | 'fuel'
  xpReward: number
}

export type BadgeAward = {
  badgeId: BadgeId
  earnedAt: string // ISO
}

export type Streak = {
  current: number // scheduled training days
  best: number
  lastTrainingDate?: string
}

export type XpEvent = {
  type: 'set' | 'workout' | 'pr' | 'flexibility' | 'skill'
  amount: number
}

export const XP = {
  set: 5,
  workout: 50,
  pr: 40,
  flexibility: 60,
  skill: 150,
} as const
