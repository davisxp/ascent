import { describe, it, expect } from 'vitest'
import {
  bmrMifflinStJeor,
  tdee,
  goalKcal,
  macros,
  buildNutritionTarget,
  foodMacros,
  proteinAdherence,
} from '../../src/engine/nutrition'
import { branded, type Kilograms, type Centimeters } from '../../src/domain/ids'

const inputs = {
  weightKg: branded<Kilograms>(80),
  heightCm: branded<Centimeters>(180),
  age: 30,
  sex: 'male' as const,
  activity: 'moderate' as const,
  goal: 'maintain' as const,
}

describe('nutrition', () => {
  it('BMR via Mifflin-St Jeor', () => {
    const b = bmrMifflinStJeor(inputs)
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(b).toBe(1780)
  })

  it('female BMR subtracts 161', () => {
    const male = bmrMifflinStJeor({ ...inputs, sex: 'male' })
    const female = bmrMifflinStJeor({ ...inputs, sex: 'female' })
    expect(female).toBe(male - 166) // +5 vs -161 => diff 166
  })

  it('TDEE = BMR * multiplier', () => {
    expect(tdee(inputs)).toBe(1780 * 1.55)
  })

  it('cut reduces kcal ~20%', () => {
    expect(goalKcal(2000, 'cut')).toBe(1600)
    expect(goalKcal(2000, 'maintain')).toBe(2000)
    expect(goalKcal(2000, 'lean-gain')).toBe(2200)
  })

  it('macros: protein 1.8/kg, fat 25%, carbs remainder', () => {
    const m = macros(2000, branded<Kilograms>(80))
    expect(m.proteinG).toBe(144)
    expect(m.fatG).toBe(56) // 0.25*2000/9 = 55.55 -> 56
    expect(m.carbsG).toBe(230) // (2000-576-504)/4 = 230
  })

  it('buildNutritionTarget assembles full target', () => {
    const t = buildNutritionTarget(inputs)
    expect(t.tdee).toBe(2759) // 1780*1.55 = 2759
    expect(t.kcal).toBe(2759)
    expect(t.proteinG).toBe(144)
    expect(t.goal).toBe('maintain')
  })

  it('foodMacros scales per 100g', () => {
    expect(foodMacros(200, 20, 10, 30, 150)).toEqual({
      kcal: 300,
      proteinG: 30,
      fatG: 15,
      carbsG: 45,
    })
  })

  it('proteinAdherence caps at 100', () => {
    expect(proteinAdherence(200, 100)).toBe(100)
    expect(proteinAdherence(50, 100)).toBe(50)
    expect(proteinAdherence(10, 0)).toBe(0)
  })
})
