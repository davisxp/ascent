/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { WardrobeRepositoryImpl } from '../../data/repositories'
import { Button, Input } from '../../ui/primitives'
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
    <div className="p-6 pb-24 md:pb-6 space-y-6 text-ink">
      <h1 className="font-display text-2xl">Wardrobe</h1>
      <p>{w.totals?.owned ?? 0} owned · {w.totals?.restoration ?? 0} restoration · {w.totals?.missing ?? 0} missing</p>
      <WardrobeItems items={items} onAdd={add} onRemove={remove} />
      {(w.categories ?? []).map((cat: any, i: number) => (
        <details key={i} className="mb-2">
          <summary>{cat.name} ({cat.items?.length ?? 0})</summary>
          <ul>{(cat.items ?? []).map((it: any, j: number) => <li key={j}>{it.n} — {it.s}</li>)}</ul>
        </details>
      ))}
      <p>Sizes: {(w.sizes ?? []).map((s: any) => `${s[0]}: ${s[1]}`).join(', ')}</p>
    </div>
  )
}

function WardrobeItems({ items, onAdd, onRemove }: { items: any[]; onAdd: (n: string, c: string) => void; onRemove: (id: string) => void }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  return (
    <div className="bg-white border border-ink/10 rounded-xl p-4 space-y-2">
      <div className="flex gap-2">
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
        <Button onClick={() => { onAdd(name, category); setName(''); setCategory('') }}>Add</Button>
      </div>
      <ul className="text-sm space-y-1">
        {items.map((it: any) => (
          <li key={it.id} className="flex justify-between">
            <span>{it.name} — {it.category} ({it.status})</span>
            <Button variant="ghost" className="text-clay" onClick={() => onRemove(it.id)}>Delete</Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
