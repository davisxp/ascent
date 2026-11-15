/**
 * Train store — zustand store composing the train slice.
 * Registered in the central sliceRegistry so features stay decoupled.
 */

import { create } from 'zustand'
import { createTrainSlice } from './slice'
import type { TrainState } from './slice'

export const useTrainStore = create<TrainState>()((set, get) =>
  createTrainSlice(set, get),
)
