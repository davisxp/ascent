/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import type { DateISO } from '../../domain/ids'
import { FoodRepositoryImpl, FoodLogRepositoryImpl } from '../../data/repositories'
import { foods as seedFoods } from '../../content/index'

const foodRepo = new FoodRepositoryImpl()
const logRepo = new FoodLogRepositoryImpl()

export function Nutrition() {
  const [foods, setFoods] = useState<any[]>([])
  const [totals, setTotals] = useState<any>(null)
  const load = async () => {
    await foodRepo.ensureSeeded(seedFoods).catch(() => {})
    setFoods(await foodRepo.getAll())
    setTotals(await logRepo.getDailyTotals(new Date().toISOString().slice(0, 10) as DateISO))
  }
  useEffect(() => { load() }, [])

  return (
    <div className="p-6 space-y-6 text-ink max-w-4xl mx-auto">
      <header className="space-y-1">
        <h1 className="font-display text-3xl">Nutrition</h1>
        <p className="text-ink-soft text-sm">Daily totals and food database.</p>
      </header>

      <section className="bg-white border border-ink/10 rounded-2xl p-5 shadow-sm">
        <h2 className="font-display text-xl">Today's totals</h2>
        {totals ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <Stat label="Kcal" value={totals.kcal} />
            <Stat label="Protein" value={totals.proteinG + 'g'} />
            <Stat label="Fat" value={totals.fatG + 'g'} />
            <Stat label="Carbs" value={totals.carbsG + 'g'} />
          </div>
        ) : (
          <p className="text-ink-soft text-sm mt-2">No entries logged today.</p>
        )}
      </section>

      <section className="bg-white border border-ink/10 rounded-2xl p-5 shadow-sm">
        <h2 className="font-display text-xl">Food database ({foods.length})</h2>
        {foods.length === 0 ? (
          <p className="text-ink-soft text-sm mt-2">No foods seeded yet.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 mt-3">
            {foods.slice(0, 40).map((f: any) => (
              <li key={f.id} className="border border-ink/10 rounded-xl px-3 py-2 text-sm">
                <p className="font-medium">{f.name}</p>
                <p className="text-xs text-ink-soft">{f.kcalPer100g} kcal/100g · P {f.proteinGPer100g} F {f.fatGPer100g} C {f.carbsGPer100g}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="border border-ink/10 rounded-xl p-3 text-center">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="font-display text-xl">{value}</p>
    </div>
  )
}