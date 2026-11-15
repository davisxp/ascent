/**
 * Fuel — TDEE/macros targets, food logging, water, rings, and a
 * 7-day kcal chart. The seeded food database is ensured on first
 * visit; custom foods persist alongside it. Targets are computed
 * with the pure nutrition engine from body stats.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, Input, Ring } from '../../ui/primitives'
import {
  BodyRepositoryImpl,
  FoodRepositoryImpl,
  FoodLogRepositoryImpl,
} from '../../data/repositories'
import { foods as seedFoods } from '../../content/index'
import { buildNutritionTarget, foodMacros, proteinAdherence, ACTIVITY_MULTIPLIERS } from '../../engine/nutrition'
import { id, todayISO, branded } from '../../domain/ids'
import type { DateISO, FoodId, Kilograms, Centimeters } from '../../domain/ids'
import { WATER_FOOD_ID } from '../../domain/fuel'
import type {
  Food,
  FoodLogEntry,
  MealName,
  NutritionTarget,
  WeightEntry,
} from '../../domain/index'
import { dailyTotalsSeries } from './chart'

const bodyRepo = new BodyRepositoryImpl()
const foodRepo = new FoodRepositoryImpl()
const foodLogRepo = new FoodLogRepositoryImpl()

const MEALS: MealName[] = ['breakfast', 'lunch', 'dinner', 'snack']

const defaultMeal = (): MealName => {
  const h = new Date().getHours()
  if (h < 11) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 22) return 'dinner'
  return 'snack'
}

const KcalBars = ({ series, target }: { series: { date: string; kcal: number }[]; target: number }) => {
  const W = 320
  const H = 110
  const pad = 6
  const max = Math.max(target, ...series.map((d) => d.kcal), 1)
  const bw = (W - pad * 2) / series.length
  const targetY = H - pad - (target / max) * (H - pad * 2)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Kcal for the last ${series.length} days against a ${target} kcal target`}>
      {series.map((d, i) => {
        const h = (d.kcal / max) * (H - pad * 2)
        return (
          <rect
            key={d.date}
            x={pad + i * bw + bw * 0.15}
            y={H - pad - h}
            width={bw * 0.7}
            height={Math.max(0, h)}
            rx={3}
            fill={d.kcal > target ? 'var(--color-marigold)' : 'var(--color-pine)'}
          />
        )
      })}
      <line x1={pad} y1={targetY} x2={W - pad} y2={targetY} stroke="var(--color-ink)" strokeWidth={1.5} strokeDasharray="5 4" />
    </svg>
  )
}

const RingStat = ({
  label,
  value,
  target,
  unit,
  color,
}: {
  label: string
  value: number
  target: number
  unit: string
  color: string
}) => (
  <div className="flex flex-col items-center gap-1">
    <Ring
      value={Math.min(value, target)}
      max={Math.max(target, 1)}
      size={72}
      color={color}
      label={`${label}: ${value} of ${target} ${unit}`}
    />
    <p className="font-mono text-sm font-bold leading-none">{Math.round(value)}</p>
    <p className="text-[10px] text-ink/40 font-mono uppercase">
      {label} / {target}
      {unit}
    </p>
  </div>
)

export const Fuel = () => {
  const [entries, setEntries] = useState<FoodLogEntry[]>([])
  const [week, setWeek] = useState<FoodLogEntry[]>([])

  // nutrition inputs (session-scoped, seeded from body data)
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<'male' | 'female' | 'other'>('male')
  const [activity, setActivity] = useState<keyof typeof ACTIVITY_MULTIPLIERS>('moderate')
  const [nutriGoal, setNutriGoal] = useState<'cut' | 'maintain' | 'lean-gain'>('maintain')

  // logging state
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Food[]>([])
  const [selected, setSelected] = useState<Food | null>(null)
  const [grams, setGrams] = useState('100')
  const [meal, setMeal] = useState<MealName>(defaultMeal())
  const [customName, setCustomName] = useState('')
  const [customKcal, setCustomKcal] = useState('')
  const [customP, setCustomP] = useState('')
  const [customF, setCustomF] = useState('')
  const [customC, setCustomC] = useState('')

  const today = todayISO()

  const target = useMemo<NutritionTarget | null>(() => {
    const wKg = Number(weight)
    const hCm = Number(height)
    const ageN = Number(age)
    if (!(wKg > 0) || !(hCm > 0) || !(ageN > 0)) return null
    return buildNutritionTarget({
      weightKg: branded<Kilograms>(wKg),
      heightCm: branded<Centimeters>(hCm),
      age: ageN,
      sex,
      activity,
      goal: nutriGoal,
    })
  }, [weight, height, age, sex, activity, nutriGoal])

  useEffect(() => {
    let cancelled = false
    const todayKey = todayISO()
    const fromISO = new Date(new Date(todayKey).getTime() - 6 * 86400000).toISOString().slice(0, 10)
    Promise.all([
      bodyRepo.getProfile().catch(() => null),
      bodyRepo.getWeightEntries().catch(() => [] as WeightEntry[]),
      foodLogRepo.getByDate(todayKey).catch(() => [] as FoodLogEntry[]),
      foodLogRepo.getRange(fromISO, todayKey).catch(() => [] as FoodLogEntry[]),
      // ensure the seeded food database exists (idempotent)
      foodRepo.ensureSeeded(seedFoods).catch(() => {}),
    ])
      .then(([profile, wEntries, log, weekLog]) => {
        if (cancelled) return
        const latest = wEntries.sort((a, b) => (a.date < b.date ? -1 : 1)).at(-1)
        setEntries(log)
        setWeek(weekLog)
        setWeight(String(latest?.weightKg ?? 70))
        if (profile?.heightCm) setHeight(String(profile.heightCm))
        if (profile?.age) setAge(String(profile.age))
        if (profile?.sex) setSex(profile.sex)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const reloadLog = useCallback(async () => {
    const fromISO = new Date(new Date(today).getTime() - 6 * 86400000).toISOString().slice(0, 10)
    const [log, weekLog] = await Promise.all([
      foodLogRepo.getByDate(today),
      foodLogRepo.getRange(fromISO, today),
    ])
    setEntries(log)
    setWeek(weekLog)
  }, [today])

  const runSearch = useCallback((q: string) => {
    if (q.trim() === '') {
      setResults([])
      return
    }
    void foodRepo.search(q).then((r) => setResults(r.slice(0, 12)))
  }, [])

  const addEntry = () => {
    if (!selected) return
    const g = Number(grams)
    if (!(g > 0)) return
    const macros = foodMacros(
      selected.kcalPer100g,
      selected.proteinGPer100g,
      selected.fatGPer100g,
      selected.carbsGPer100g,
      g,
    )
    const entry: FoodLogEntry = {
      id: id(),
      foodId: selected.id,
      foodName: selected.name,
      grams: g,
      kcal: macros.kcal,
      proteinG: macros.proteinG,
      fatG: macros.fatG,
      carbsG: macros.carbsG,
      meal,
      date: today,
    }
    void foodLogRepo.save(entry).then(() => {
      void reloadLog()
      setSelected(null)
      setSearch('')
      setResults([])
      setGrams('100')
    })
  }

  const addWater = () => {
    const entry: FoodLogEntry = {
      id: id(),
      foodId: WATER_FOOD_ID as unknown as FoodId,
      foodName: 'Water',
      grams: 250,
      kcal: 0,
      proteinG: 0,
      fatG: 0,
      carbsG: 0,
      meal: 'snack',
      date: today,
    }
    void foodLogRepo.save(entry).then(reloadLog)
  }

  const deleteEntry = (entryId: string) => {
    void foodLogRepo.delete(entryId).then(reloadLog)
  }

  const addCustomFood = () => {
    const kcal = Number(customKcal)
    const p = Number(customP)
    const f = Number(customF)
    const c = Number(customC)
    if (customName.trim() === '' || !(kcal >= 0) || !(p >= 0) || !(f >= 0) || !(c >= 0)) return
    const food: Food = {
      id: id() as unknown as FoodId,
      name: customName.trim(),
      kcalPer100g: kcal,
      proteinGPer100g: p,
      fatGPer100g: f,
      carbsGPer100g: c,
      category: 'Custom',
      custom: true,
      createdAt: today as unknown as DateISO,
    }
    void foodRepo.save(food).then(() => {
      setCustomName('')
      setCustomKcal('')
      setCustomP('')
      setCustomF('')
      setCustomC('')
    })
  }

  const foodEntries = useMemo(
    () => entries.filter((e) => e.foodId !== WATER_FOOD_ID),
    [entries],
  )

  const totals = useMemo(() => {
    const kcal = foodEntries.reduce((s, e) => s + e.kcal, 0)
    return {
      kcal,
      proteinG: foodEntries.reduce((s, e) => s + e.proteinG, 0),
      fatG: foodEntries.reduce((s, e) => s + e.fatG, 0),
      carbsG: foodEntries.reduce((s, e) => s + e.carbsG, 0),
    }
  }, [foodEntries])

  const waterMl = useMemo(
    () => entries.filter((e) => e.foodId === WATER_FOOD_ID).reduce((s, e) => s + e.grams, 0),
    [entries],
  )

  const weekSeries = useMemo(
    () => dailyTotalsSeries(week, 7, new Date(today)),
    [week, today],
  )

  const byMeal = useMemo(() => {
    const map = new Map<MealName, FoodLogEntry[]>()
    for (const m of MEALS) map.set(m, [])
    for (const e of foodEntries) map.get(e.meal)?.push(e)
    return map
  }, [foodEntries])

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Fuel</h1>
      <p className="text-sm text-ink/60 mb-4">Targets from your body stats; log food and water as you go.</p>

      {target && (
        <>
          {/* rings */}
          <Card className="mb-4">
            <div className="flex items-center justify-around gap-2 flex-wrap">
              <RingStat label="Kcal" value={totals.kcal} target={target.kcal} unit="" color="var(--color-pine)" />
              <RingStat label="Protein" value={totals.proteinG} target={target.proteinG} unit="g" color="var(--color-marigold)" />
              <RingStat label="Fat" value={totals.fatG} target={target.fatG} unit="g" color="var(--color-teal)" />
              <RingStat label="Carbs" value={totals.carbsG} target={target.carbsG} unit="g" color="var(--color-clay)" />
            </div>
            <p className="text-xs text-ink/50 text-center mt-2">
              Protein adherence {proteinAdherence(totals.proteinG, target.proteinG)}% · TDEE {target.tdee} kcal
            </p>
          </Card>

          {/* water */}
          <Card className="mb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold">Water</h2>
                <p className="font-mono text-xl font-bold text-teal">
                  {waterMl} / {target.waterMl} ml
                </p>
              </div>
              <Button onClick={addWater} className="h-11 px-5">
                + 250 ml
              </Button>
            </div>
          </Card>

          {/* targets editor */}
          <Card className="mb-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h2 className="font-display text-lg font-bold">Targets</h2>
              <Badge variant="warn">{nutriGoal === 'lean-gain' ? '+10%' : nutriGoal === 'cut' ? '−20%' : 'maintain'}</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
              <NumberField label="Weight kg" value={weight} onChange={setWeight} />
              <NumberField label="Height cm" value={height} onChange={setHeight} />
              <NumberField label="Age" value={age} onChange={setAge} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <SelectField
                label="Sex"
                value={sex}
                onChange={(v) => setSex(v as typeof sex)}
                options={[
                  ['male', 'Male'],
                  ['female', 'Female'],
                  ['other', 'Other'],
                ]}
              />
              <SelectField
                label="Activity"
                value={activity}
                onChange={(v) => setActivity(v as keyof typeof ACTIVITY_MULTIPLIERS)}
                options={[
                  ['sedentary', 'Sedentary'],
                  ['light', 'Light'],
                  ['moderate', 'Moderate'],
                  ['active', 'Active'],
                  ['veryActive', 'Very active'],
                ]}
              />
              <SelectField
                label="Goal"
                value={nutriGoal}
                onChange={(v) => setNutriGoal(v as typeof nutriGoal)}
                options={[
                  ['cut', 'Cut'],
                  ['maintain', 'Maintain'],
                  ['lean-gain', 'Lean gain'],
                ]}
              />
            </div>
          </Card>
        </>
      )}

      {/* log food */}
      <Card className="mb-4">
        <h2 className="font-display text-lg font-bold mb-2">Log food</h2>
        <Input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            runSearch(e.target.value)
          }}
          placeholder="Search foods…"
          aria-label="Search foods"
          className="w-full h-11 rounded-[14px] px-4 mb-2"
        />
        {results.length > 0 && !selected && (
          <ul className="divide-y divide-ink/5 mb-2 max-h-56 overflow-y-auto">
            {results.map((f) => (
              <li key={f.id}>
                <button
                  className="w-full text-left px-2 py-2 hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pine"
                  onClick={() => {
                    setSelected(f)
                    setGrams(String(f.householdMeasure?.grams ?? 100))
                    setResults([])
                    setSearch(f.name)
                  }}
                >
                  <span className="text-sm font-bold">{f.name}</span>
                  <span className="ml-2 text-xs text-ink/50">
                    {f.kcalPer100g} kcal/100g · P {f.proteinGPer100g}
                  </span>
                  {f.custom && <Badge variant="warn" className="ml-2">Custom</Badge>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {selected && (
          <div className="border border-ink/10 rounded-[14px] p-3 mb-2">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-sm font-bold">{selected.name}</p>
                {selected.householdMeasure && (
                  <Button
                    variant="ghost"
                    className="h-8 px-2 text-xs"
                    onClick={() => setGrams(String(selected.householdMeasure?.grams ?? 100))}
                  >
                    Use {selected.householdMeasure.name} ({selected.householdMeasure.grams} g)
                  </Button>
                )}
              </div>
              <Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => setSelected(null)} aria-label="Clear selected food">
                Change
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                type="number"
                inputMode="decimal"
                min="1"
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                aria-label="Grams"
                className="w-24 h-11"
              />
              <select
                value={meal}
                onChange={(e) => setMeal(e.target.value as MealName)}
                aria-label="Meal"
                className="h-11 rounded-[14px] border border-ink/20 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
              >
                {MEALS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <Button onClick={addEntry} disabled={!(Number(grams) > 0)} className="h-11 px-5">
                Add
              </Button>
            </div>
          </div>
        )}
        <details>
          <summary className="cursor-pointer text-sm text-pine font-bold select-none">
            Add a custom food
          </summary>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
            <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Name" aria-label="Custom food name" className="col-span-2 sm:col-span-5 h-11" />
            <NumberField label="Kcal/100g" value={customKcal} onChange={setCustomKcal} />
            <NumberField label="Protein g" value={customP} onChange={setCustomP} />
            <NumberField label="Fat g" value={customF} onChange={setCustomF} />
            <NumberField label="Carbs g" value={customC} onChange={setCustomC} />
            <Button onClick={addCustomFood} className="h-11 col-span-2 sm:col-span-1" disabled={customName.trim() === ''}>
              Save
            </Button>
          </div>
        </details>
      </Card>

      {/* today's log */}
      <Card className="mb-4">
        <h2 className="font-display text-lg font-bold mb-2">Today</h2>
        {foodEntries.length === 0 ? (
          <p className="text-sm text-ink/50">Nothing logged yet today.</p>
        ) : (
          <div className="space-y-3">
            {MEALS.map((m) => {
              const list = byMeal.get(m) ?? []
              if (list.length === 0) return null
              return (
                <div key={m}>
                  <p className="text-[11px] font-mono uppercase tracking-widest text-ink/40 mb-1">{m}</p>
                  <ul className="divide-y divide-ink/5">
                    {list.map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                        <span>
                          {e.foodName} <span className="text-ink/40 font-mono text-xs">{e.grams}g</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-mono">{e.kcal} kcal</span>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 text-ink/40"
                            aria-label={`Delete ${e.foodName} entry`}
                            onClick={() => deleteEntry(e.id)}
                          >
                            ✕
                          </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* week chart */}
      <Card>
        <h2 className="font-display text-lg font-bold mb-2">Last 7 days</h2>
        <KcalBars series={weekSeries} target={target?.kcal ?? 2000} />
        <ul className="flex justify-between mt-1 px-1" aria-hidden="true">
          {weekSeries.map((d) => (
            <li key={d.date} className="font-mono text-[9px] text-ink/40">
              {d.date.slice(5)}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

const NumberField = ({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) => (
  <label className="block">
    <span className="block text-[11px] font-mono uppercase text-ink/40 mb-1">{label}</span>
    <Input
      type="number"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-11"
    />
  </label>
)

const SelectField = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: [string, string][]
}) => (
  <label className="block">
    <span className="block text-[11px] font-mono uppercase text-ink/40 mb-1">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-11 rounded-[8px] border border-ink/20 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  </label>
)

// Activity multiplier keys come from the nutrition engine (ACTIVITY_MULTIPLIERS).
