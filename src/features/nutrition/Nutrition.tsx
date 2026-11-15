/* eslint-disable @typescript-eslint/no-explicit-any */
import data from '../../content/compendium.json'
export function Nutrition() {
  const c = data as any
  const n = c.body?.nutrition ?? {}
  return (
    <div className="p-6 pb-24 md:pb-6 space-y-4 text-ink">
      <h1 className="font-display text-2xl font-bold">Nutrition</h1>
      <p className="text-sm text-ink/60">TDEE {n.tdee} · Target cal {n.targetCal} · Deficit {n.deficit}</p>
      <ul className="space-y-1 text-sm">{(n.macros ?? []).map((m: any, i: number) => <li key={i}>{m[0]}: {m[1]}g ({m[3]})</li>)}</ul>
    </div>
  )
}

