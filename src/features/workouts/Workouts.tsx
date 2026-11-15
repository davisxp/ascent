/* eslint-disable @typescript-eslint/no-explicit-any */
import data from '../../content/compendium.json'
export function Workouts() {
  const c = data as any
  return (
    <div style={{ padding: 24, display: 'grid', gap: 16 }}>
      <h1>Workouts</h1>
      {(c.workouts?.days ?? []).map((d: any) => (
        <div key={d.name} style={{ marginBottom: 12 }}>
          <strong>{d.name}</strong>{d.rest ? ' (rest)' : ''}
          <ul>{(d.exercises ?? []).map((e: any, i: number) => <li key={i}>{e.n} — {e.w}kg × {e.r}</li>)}</ul>
        </div>
      ))}
    </div>
  )
}

