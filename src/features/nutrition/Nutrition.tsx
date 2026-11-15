/* eslint-disable @typescript-eslint/no-explicit-any */
import data from '../../content/compendium.json'
export function Nutrition() {
  const c = data as any
  const n = c.body?.nutrition ?? {}
  return (
    <div style={{ padding: 24, display: 'grid', gap: 16 }}>
      <h1>Nutrition</h1>
      <p>TDEE {n.tdee} · Target cal {n.targetCal} · Deficit {n.deficit}</p>
      <ul>{(n.macros ?? []).map((m: any, i: number) => <li key={i}>{m[0]}: {m[1]}g ({m[3]})</li>)}</ul>
    </div>
  )
}

