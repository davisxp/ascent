/* eslint-disable @typescript-eslint/no-explicit-any */
import data from '../../content/compendium.json'

export function Curriculum() {
  const c = data as any
  const stem = (c.curriculum?.stem?.parts ?? []).slice().sort((a: any, b: any) => String(a?.title ?? '').localeCompare(String(b?.title ?? '')))
  const hum = (c.curriculum?.humanities?.parts ?? []).slice().sort((a: any, b: any) => String(a?.title ?? '').localeCompare(String(b?.title ?? '')))

  return (
    <div className="p-6 space-y-6 text-ink max-w-4xl mx-auto">
      <header className="space-y-1">
        <h1 className="font-display text-3xl">Curriculum</h1>
        <p className="text-ink-soft text-sm">STEM and humanities, sorted.</p>
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-xl">STEM</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {stem.map((p: any, i: number) => (
            <details key={i} className="bg-white border border-ink/10 rounded-2xl p-4 shadow-sm">
              <summary className="font-medium cursor-pointer">{p.title} <span className="text-ink-soft text-sm">({p.items?.length ?? 0})</span></summary>
              <ul className="text-sm space-y-1 mt-2 text-ink-soft">{(p.items ?? []).slice().sort().map((it: string, j: number) => <li key={j}>{it}</li>)}</ul>
            </details>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl">Humanities</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {hum.map((p: any, i: number) => (
            <details key={i} className="bg-white border border-ink/10 rounded-2xl p-4 shadow-sm">
              <summary className="font-medium cursor-pointer">{p.title} <span className="text-ink-soft text-sm">({p.items?.length ?? 0})</span></summary>
              <ul className="text-sm space-y-1 mt-2 text-ink-soft">{(p.items ?? []).slice().sort().map((it: string, j: number) => <li key={j}>{it}</li>)}</ul>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}