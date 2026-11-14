/**
 * Body domain types — weight, measurements, photos.
 */

import type { BodyEntryId, MeasurementId, PhotoId, DateISO, Kilograms, Centimeters } from './ids'

export type MeasurementSite = 'shoulders' | 'chest' | 'waist' | 'hips' | 'arm' | 'thigh' | 'calf'

export type WeightEntry = {
  id: BodyEntryId
  date: DateISO
  weightKg: Kilograms
  source: 'manual' | 'scale'
}

export type MeasurementEntry = {
  id: MeasurementId
  date: DateISO
  site: MeasurementSite
  valueCm: Centimeters
}

export type Photo = {
  id: PhotoId
  date: DateISO
  view: 'front' | 'side' | 'back'
  blob: string // base64, stored in IndexedDB, never leaves device
  thumbnail: string // base64 thumbnail
  width: number
  height: number
}

export type BodyProfile = {
  userId: string
  age?: number
  heightCm?: Centimeters
  sex?: 'male' | 'female' | 'other'
  units: 'metric' | 'imperial'
  goal: 'strength' | 'skills' | 'flexibility' | 'balanced'
  experience: 'beginner' | 'intermediate' | 'advanced'
  daysPerWeek: 2 | 3 | 4 | 5 | 6
  sessionLength: 20 | 30 | 45 | 60
  barEnabled: boolean
  assessmentCompleted: boolean
  createdAt: DateISO
  updatedAt: DateISO
}
