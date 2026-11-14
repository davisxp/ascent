/**
 * Chain definitions — unlock progressions linking exercises.
 */

import type { Chain } from '../domain/exercise'

const chain = (o: unknown): Chain => o as Chain

export const chains: Chain[] = [
  chain({
    id: 'chain-pushup',
    name: 'Push-Up',
    pattern: 'push',
    steps: [
      { step: 1, exerciseId: 'ex-pushup-wall', unlockCriteria: [] },
      { step: 2, exerciseId: 'ex-pushup-incline', unlockCriteria: [{ exerciseId: 'ex-pushup-wall', metric: 'reps', value: 15 }] },
      { step: 3, exerciseId: 'ex-pushup-knee', unlockCriteria: [{ exerciseId: 'ex-pushup-incline', metric: 'reps', value: 15 }] },
      { step: 4, exerciseId: 'ex-pushup-full', unlockCriteria: [{ exerciseId: 'ex-pushup-knee', metric: 'reps', value: 15 }] },
      { step: 5, exerciseId: 'ex-pushup-diamond', unlockCriteria: [{ exerciseId: 'ex-pushup-full', metric: 'reps', value: 15 }] },
      { step: 6, exerciseId: 'ex-pushup-pseudo-planche', unlockCriteria: [{ exerciseId: 'ex-pushup-diamond', metric: 'reps', value: 12 }] },
      { step: 7, exerciseId: 'ex-pushup-archer', unlockCriteria: [{ exerciseId: 'ex-pushup-pseudo-planche', metric: 'reps', value: 10 }] },
      { step: 8, exerciseId: 'ex-pushup-one-arm', unlockCriteria: [{ exerciseId: 'ex-pushup-archer', metric: 'reps', value: 8 }] },
    ],
  }),
  chain({
    id: 'chain-hspu',
    name: 'Handstand Push-Up',
    pattern: 'push',
    steps: [
      { step: 1, exerciseId: 'ex-hspu-pike', unlockCriteria: [] },
      { step: 2, exerciseId: 'ex-hspu-elevated-pike', unlockCriteria: [{ exerciseId: 'ex-hspu-pike', metric: 'reps', value: 12 }] },
      { step: 3, exerciseId: 'ex-hspu-wall-negative', unlockCriteria: [{ exerciseId: 'ex-hspu-elevated-pike', metric: 'reps', value: 10 }] },
      { step: 4, exerciseId: 'ex-hspu-wall', unlockCriteria: [{ exerciseId: 'ex-hspu-wall-negative', metric: 'reps', value: 5 }] },
    ],
  }),
  chain({
    id: 'chain-row',
    name: 'Table Row',
    pattern: 'pull',
    steps: [
      { step: 1, exerciseId: 'ex-row-door-frame', unlockCriteria: [] },
      { step: 2, exerciseId: 'ex-row-table-bent-knee', unlockCriteria: [{ exerciseId: 'ex-row-door-frame', metric: 'reps', value: 15 }] },
      { step: 3, exerciseId: 'ex-row-table-straight-leg', unlockCriteria: [{ exerciseId: 'ex-row-table-bent-knee', metric: 'reps', value: 15 }] },
      { step: 4, exerciseId: 'ex-row-table-feet-elevated', unlockCriteria: [{ exerciseId: 'ex-row-table-straight-leg', metric: 'reps', value: 12 }] },
      { step: 5, exerciseId: 'ex-row-table-archer', unlockCriteria: [{ exerciseId: 'ex-row-table-feet-elevated', metric: 'reps', value: 12 }] },
    ],
  }),
  chain({
    id: 'chain-squat',
    name: 'Squat',
    pattern: 'squat',
    steps: [
      { step: 1, exerciseId: 'ex-squat-chair-box', unlockCriteria: [] },
      { step: 2, exerciseId: 'ex-squat-full', unlockCriteria: [{ exerciseId: 'ex-squat-chair-box', metric: 'reps', value: 20 }] },
      { step: 3, exerciseId: 'ex-squat-split', unlockCriteria: [{ exerciseId: 'ex-squat-full', metric: 'reps', value: 20 }] },
      { step: 4, exerciseId: 'ex-squat-bulgarian', unlockCriteria: [{ exerciseId: 'ex-squat-split', metric: 'reps', value: 15 }] },
      { step: 5, exerciseId: 'ex-squat-assisted-pistol', unlockCriteria: [{ exerciseId: 'ex-squat-bulgarian', metric: 'reps', value: 12 }] },
      { step: 6, exerciseId: 'ex-squat-box-pistol', unlockCriteria: [{ exerciseId: 'ex-squat-assisted-pistol', metric: 'reps', value: 10 }] },
      { step: 7, exerciseId: 'ex-squat-pistol', unlockCriteria: [{ exerciseId: 'ex-squat-box-pistol', metric: 'reps', value: 8 }] },
      { step: 8, exerciseId: 'ex-squat-shrimp', unlockCriteria: [{ exerciseId: 'ex-squat-pistol', metric: 'reps', value: 5 }] },
    ],
  }),
  chain({
    id: 'chain-hip',
    name: 'Hip & Hamstring',
    pattern: 'hinge',
    steps: [
      { step: 1, exerciseId: 'ex-bridge-glute', unlockCriteria: [] },
      { step: 2, exerciseId: 'ex-bridge-single-leg', unlockCriteria: [{ exerciseId: 'ex-bridge-glute', metric: 'reps', value: 20 }] },
      { step: 3, exerciseId: 'ex-hip-couch-thrust', unlockCriteria: [{ exerciseId: 'ex-bridge-single-leg', metric: 'reps', value: 15 }] },
      { step: 4, exerciseId: 'ex-hip-towel-slider-curl', unlockCriteria: [{ exerciseId: 'ex-hip-couch-thrust', metric: 'reps', value: 15 }] },
      { step: 5, exerciseId: 'ex-hip-nordic-negative', unlockCriteria: [{ exerciseId: 'ex-hip-towel-slider-curl', metric: 'reps', value: 12 }] },
      { step: 6, exerciseId: 'ex-hip-nordic', unlockCriteria: [{ exerciseId: 'ex-hip-nordic-negative', metric: 'reps', value: 5 }] },
    ],
  }),
  chain({
    id: 'chain-core',
    name: 'Core',
    pattern: 'core',
    steps: [
      { step: 1, exerciseId: 'ex-core-dead-bug', unlockCriteria: [] },
      { step: 2, exerciseId: 'ex-core-plank', unlockCriteria: [{ exerciseId: 'ex-core-dead-bug', metric: 'reps', value: 15 }] },
      { step: 3, exerciseId: 'ex-core-hollow-hold', unlockCriteria: [{ exerciseId: 'ex-core-plank', metric: 'hold-seconds', value: 30 }] },
      { step: 4, exerciseId: 'ex-core-hollow-rocks', unlockCriteria: [{ exerciseId: 'ex-core-hollow-hold', metric: 'hold-seconds', value: 20 }] },
      { step: 5, exerciseId: 'ex-core-tuck-dragon-flag', unlockCriteria: [{ exerciseId: 'ex-core-hollow-rocks', metric: 'reps', value: 10 }] },
      { step: 6, exerciseId: 'ex-core-one-leg-dragon-flag', unlockCriteria: [{ exerciseId: 'ex-core-tuck-dragon-flag', metric: 'hold-seconds', value: 20 }] },
      { step: 7, exerciseId: 'ex-core-full-dragon-flag', unlockCriteria: [{ exerciseId: 'ex-core-one-leg-dragon-flag', metric: 'hold-seconds', value: 20 }] },
    ],
  }),
  chain({
    id: 'chain-lsit',
    name: 'L-Sit → V-Sit',
    pattern: 'l-sit',
    steps: [
      { step: 1, exerciseId: 'ex-lsit-chair', unlockCriteria: [] },
      { step: 2, exerciseId: 'ex-lsit-tuck', unlockCriteria: [{ exerciseId: 'ex-lsit-chair', metric: 'hold-seconds', value: 20 }] },
      { step: 3, exerciseId: 'ex-lsit-full', unlockCriteria: [{ exerciseId: 'ex-lsit-tuck', metric: 'hold-seconds', value: 20 }] },
      { step: 4, exerciseId: 'ex-lsit-v-sit', unlockCriteria: [{ exerciseId: 'ex-lsit-full', metric: 'hold-seconds', value: 20 }] },
    ],
  }),
  chain({
    id: 'chain-crow',
    name: 'Crow → Elbow Lever',
    pattern: 'handstand',
    steps: [
      { step: 1, exerciseId: 'ex-skill-crow', unlockCriteria: [] },
      { step: 2, exerciseId: 'ex-skill-elbow-lever', unlockCriteria: [{ exerciseId: 'ex-skill-crow', metric: 'hold-seconds', value: 15 }] },
    ],
  }),
  chain({
    id: 'chain-handstand',
    name: 'Handstand',
    pattern: 'handstand',
    steps: [
      { step: 1, exerciseId: 'ex-hs-wall-handstand', unlockCriteria: [] },
      { step: 2, exerciseId: 'ex-hs-chest-to-wall', unlockCriteria: [{ exerciseId: 'ex-hs-wall-handstand', metric: 'hold-seconds', value: 30 }] },
      { step: 3, exerciseId: 'ex-hs-shoulder-taps', unlockCriteria: [{ exerciseId: 'ex-hs-chest-to-wall', metric: 'hold-seconds', value: 30 }] },
      { step: 4, exerciseId: 'ex-hs-freestanding', unlockCriteria: [{ exerciseId: 'ex-hs-shoulder-taps', metric: 'reps', value: 10 }] },
      { step: 5, exerciseId: 'ex-hs-press-negative', unlockCriteria: [{ exerciseId: 'ex-hs-freestanding', metric: 'hold-seconds', value: 10 }] },
    ],
  }),
  chain({
    id: 'chain-planche',
    name: 'Planche',
    pattern: 'planche',
    steps: [
      { step: 1, exerciseId: 'ex-planche-lean', unlockCriteria: [] },
      { step: 2, exerciseId: 'ex-planche-tuck', unlockCriteria: [{ exerciseId: 'ex-planche-lean', metric: 'hold-seconds', value: 30 }] },
      { step: 3, exerciseId: 'ex-planche-advanced-tuck', unlockCriteria: [{ exerciseId: 'ex-planche-tuck', metric: 'hold-seconds', value: 20 }] },
      { step: 4, exerciseId: 'ex-planche-straddle', unlockCriteria: [{ exerciseId: 'ex-planche-advanced-tuck', metric: 'hold-seconds', value: 20 }] },
      { step: 5, exerciseId: 'ex-planche-full', unlockCriteria: [{ exerciseId: 'ex-planche-straddle', metric: 'hold-seconds', value: 15 }] },
    ],
  }),
  chain({
    id: 'chain-front-lever',
    name: 'Front Lever',
    pattern: 'front-lever',
    steps: [
      { step: 1, exerciseId: 'ex-fl-table-tuck', unlockCriteria: [] },
      { step: 2, exerciseId: 'ex-fl-advanced-tuck', unlockCriteria: [{ exerciseId: 'ex-fl-table-tuck', metric: 'hold-seconds', value: 20 }] },
      { step: 3, exerciseId: 'ex-fl-one-leg', unlockCriteria: [{ exerciseId: 'ex-fl-advanced-tuck', metric: 'hold-seconds', value: 20 }] },
      { step: 4, exerciseId: 'ex-fl-straddle', unlockCriteria: [{ exerciseId: 'ex-fl-one-leg', metric: 'hold-seconds', value: 15 }] },
    ],
  }),
  chain({
    id: 'chain-bridge',
    name: 'Bridge',
    pattern: 'bridge',
    steps: [
      { step: 1, exerciseId: 'ex-bridge-table', unlockCriteria: [] },
      { step: 2, exerciseId: 'ex-bridge-wall-walk', unlockCriteria: [{ exerciseId: 'ex-bridge-table', metric: 'hold-seconds', value: 20 }] },
      { step: 3, exerciseId: 'ex-bridge-full', unlockCriteria: [{ exerciseId: 'ex-bridge-wall-walk', metric: 'reps', value: 5 }] },
      { step: 4, exerciseId: 'ex-bridge-pushup', unlockCriteria: [{ exerciseId: 'ex-bridge-full', metric: 'hold-seconds', value: 20 }] },
    ],
  }),
  chain({
    id: 'chain-bar',
    name: 'Bar (Optional)',
    pattern: 'pull',
    steps: [
      { step: 1, exerciseId: 'ex-bar-pull-up', unlockCriteria: [] },
      { step: 2, exerciseId: 'ex-bar-hanging-leg-raise', unlockCriteria: [{ exerciseId: 'ex-bar-pull-up', metric: 'reps', value: 5 }] },
      { step: 3, exerciseId: 'ex-bar-muscle-up', unlockCriteria: [{ exerciseId: 'ex-bar-pull-up', metric: 'reps', value: 8 }] },
    ],
  }),
]

export const chainById = new Map(chains.map((c) => [c.id, c]))
