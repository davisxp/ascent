/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { FoodRepositoryImpl } from '../../data/repositories'
import data from '../../content/compendium.json'

const foodRepo = new FoodRepositoryImpl()

export function Nutrition() {
  const c = data as any
  const n = c.body?.nutrition ?? {}
  const [foods, setFoods] = useState<any[]>([])
  const load = async () => setFoods(await foodRepo.getAll())
  useEffect(() => { load() }, [])

  return (
    <div className="p-6 space-y-4 text-ink">
      <h1 className="font-display text-2xl">Nutrition</h1>
      <p className="text-sm text-ink-soft">{n.calories ?? ''} kcal target</p>
      <p className="text-sm">Foods in DB: {foods.length}</p>
      <pre className="text-xs whitespace-pre-wrap bg-white border rounded p-4">{JSON.stringify(n, null, 2).slice(0, 2000)}</pre>
    </div>
  )
}