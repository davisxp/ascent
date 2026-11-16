/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { WardrobeRepositoryImpl } from '../../data/repositories'
import data from '../../content/compendium.json'

const repo = new WardrobeRepositoryImpl()

export function Wardrobe() {
  const c = data as any
  const w = c.wardrobe ?? {}
  const [items, setItems] = useState<any[]>([])
  const load = async () => setItems(await repo.getAll())
  useEffect(() => { load() }, [])

  const add = async (name: string, category: string) => {
    if (!name) return
    await repo.save({ id: crypto.randomUUID(), name, category: category || 'misc', status: 'owned' })
    load()
  }
  const remove = async (id: string) => { await repo.delete(id); load() }

  return (
    <div className="p-6 space-y-6 text-ink max-w-4xl mx-auto">
      <header className="space-y-1">
        <h1 className="font-display text-3xl">Wardrobe</h1>
        <p className="text-ink-soft text-sm">
          {w.totals?.owned ?? 0} owned · {w.totals?.restoration ?? 0} restoration · {w.totals?.missing ?? 0} missing
        </p>
      </header>

      <section className="bg-white border border-ink/10 rounded-2xl p-5 space-y-3 shadow-sm">
        <h2 className="font-display text-xl">Add garment</h2>
        <WardrobeForm onAdd={add} />
      </section>

      <section className="bg-white border border-ink/10 rounded-2xl p-5 space-y-3 shadow-sm">
        <h2 className="font-display text-xl">Your garments ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-ink-soft text-sm">No garments yet — add one above.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {items.map((it: any) => (
              <li key={it.id} className="flex items-center justify-between border border-ink/10 rounded-xl px-3 py-2">
                <div>
                  <p className="font-medium text-sm">{it.name}</p>
                  <p className="text-xs text-ink-soft">{it.category} · {it.status}</p>
                </div>
                <button className="text-clay text-xs hover:underline" onClick={() => remove(it.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl">Reference categories</h2>
        {(w.categories ?? []).map((cat: any, i: number) => (
          <details key={i} className="bg-white border border-ink/10 rounded-2xl p-4 shadow-sm">
            <summary className="font-medium cursor-pointer">{cat.name} <span className="text-ink-soft text-sm">({cat.items?.length ?? 0})</span></summary>
            <ul className="text-sm space-y-1 mt-2">{(cat.items ?? []).map((it: any, j: number) => <li key={j} className="text-ink-soft">{it.n} — {it.s}</li>)}</ul>
          </details>
        ))}
      </section>

      <section className="bg-white border border-ink/10 rounded-2xl p-5 shadow-sm">
        <h2 className="font-display text-xl">Sizes</h2>
        <p className="text-sm text-ink-soft">{(w.sizes ?? []).map((s: any) => `${s[0]}: ${s[1]}`).join(' · ')}</p>
      </section>
    </div>
  )
}

function WardrobeForm({ onAdd }: { onAdd: (n: string, c: string) => void }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  return (
    <div className="flex flex-wrap gap-2">
      <input className="border border-ink/20 rounded-lg px-3 py-2 flex-1 min-w-[160px]" placeholder="Garment name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="border border-ink/20 rounded-lg px-3 py-2 flex-1 min-w-[160px]" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
      <button className="px-4 py-2 bg-pine text-white rounded-lg hover:opacity-90" onClick={() => { onAdd(name, category); setName(''); setCategory('') }}>Add</button>
    </div>
  )
}