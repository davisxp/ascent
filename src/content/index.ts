/**
 * Content barrel — all typed seed data.
 * Features import exercises, chains, foods, and cues from here.
 */

export { exercises, exerciseCount } from './exercises'
export { chains, chainById } from './chains'
export { mobilityExercises, mobilityChainById } from './mobility'
export { foods, foodCount } from './foods'
export { pushCues, pullCues, squatCues, hingeCues, coreCues, holdCues, mobilityCues, commonMistakes, cueBank } from './cues'

import { exercises } from './exercises'
import { mobilityExercises } from './mobility'
import type { Exercise } from '../domain/exercise'

/** Every exercise (strength + mobility) in one array. */
export const allExercises: Exercise[] = [...exercises, ...mobilityExercises]

/** Lookup by exercise id across strength and mobility content. */
export const exerciseById = new Map<string, Exercise>(allExercises.map((e) => [e.id, e]))

export type { Exercise, Chain, ChainStep, UnlockCriterion, Metric, Equipment, Pattern, Difficulty } from '../domain/exercise'
