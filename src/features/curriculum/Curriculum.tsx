/* eslint-disable @typescript-eslint/no-explicit-any */
import data from '../../content/compendium.json'
export function Curriculum() {
  const c = data as any
  return (
    <div className="p-6 pb-24 md:pb-6 space-y-4 text-ink">
      <h1 className="font-display text-2xl font-bold">Curriculum</h1>
      <h2 className="font-display text-lg font-bold">STEM</h2>
      {(c.curriculum?.stem?.parts ?? []).slice().sort((a: any, b: any) => String(a?.title ?? '').localeCompare(String(b?.title ?? ''))).map((p: any, i: number) => (
        <details key={i} className="mb-2 border border-ink/10 rounded-[14px] bg-white p-3">
          <summary className="font-bold cursor-pointer">{p.title} ({p.items?.length ?? 0})</summary>
          <ul className="mt-2 space-y-1 text-sm">{(p.items ?? []).slice().sort().map((it: string, j: number) => <li key={j}>{it}</li>)}</ul>
        </details>
      ))}
      <h2 className="font-display text-lg font-bold">Humanities</h2>
      {(c.curriculum?.humanities?.parts ?? []).slice().sort((a: any, b: any) => String(a?.title ?? '').localeCompare(String(b?.title ?? ''))).map((p: any, i: number) => (
        <details key={i} className="mb-2 border border-ink/10 rounded-[14px] bg-white p-3">
          <summary className="font-bold cursor-pointer">{p.title} ({p.items?.length ?? 0})</summary>
          <ul className="mt-2 space-y-1 text-sm">{(p.items ?? []).slice().sort().map((it: string, j: number) => <li key={j}>{it}</li>)}</ul>
        </details>
      ))}
    </div>
  )
}

