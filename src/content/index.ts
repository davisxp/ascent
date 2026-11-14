/**
 * Content barrel — all typed seed data.
 * Features import exercises, chains, foods, and cues from here.
 */

export { exercises, exerciseCount } from './exercises'
export { chains, chainById } from './chains'
export { mobilityExercises, mobilityChainById } from './mobility'
export { foods, foodCount } from './foods'
export { pushCues, pullCues, squatCues, hingeCues, coreCues, holdCues, mobilityCues, commonMistakes, cueBank } from './cues'

export type { Exercise, Chain, ChainStep, UnlockCriterion, Metric, Equipment, Pattern, Difficulty } from '../domain/exercise'
