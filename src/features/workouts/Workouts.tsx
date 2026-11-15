/* eslint-disable @typescript-eslint/no-explicit-any */
import data from '../../content/compendium.json'
export function Workouts() {
  const c = data as any
  return (
    <div className="p-6 pb-24 md:pb-6 space-y-4 text-ink">
      <h1 className="font-display text-2xl font-bold">Workouts</h1>
      {(c.workouts?.days ?? []).map((d: any) => (
        <div key={d.name} className="border border-ink/10 rounded-[14px] bg-white p-4 space-y-2">
          <p className="font-bold">{d.name}{d.rest ? ' (rest)' : ''}</p>
          <ul className="text-sm space-y-1">{(d.exercises ?? []).map((e: any, i: number) => <li key={i}>{e.n} — {e.w}kg × {e.r}</li>)}</ul>
        </div>
      ))}
    </div>
  )
}

