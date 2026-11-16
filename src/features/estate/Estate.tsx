/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { EstateRepositoryImpl } from '../../data/repositories'

const repo = new EstateRepositoryImpl()

export function Estate() {
  const [items, setItems] = useState<any[]>([])
  const load = async () => setItems(await repo.getAll())
  useEffect(() => { load() }, [])

  const add = async (name: string, value: string) => { if (!name) return; await repo.save({ id: crypto.randomUUID(), name, value: Number(value) || 0 }); load() }
  const remove = async (id: string) => { await repo.delete(id); load() }

  const total = items.reduce((s, i) => s + (i.value || 0), 0)

  return (
    <div className="p-6 space-y-6 text-ink max-w-4xl mx-auto">
      <header className="space-y-1">
        <h1 className="font-display text-3xl">Estate</h1>
        <p className="text-ink-soft text-sm">Total value: {total}</p>
      </header>

      <section className="bg-white border border-ink/10 rounded-2xl p-5 space-y-3 shadow-sm">
        <h2 className="font-display text-xl">Add asset</h2>
        <EstateForm onAdd={add} />
      </section>

      <section className="bg-white border border-ink/10 rounded-2xl p-5 space-y-3 shadow-sm">
        <h2 className="font-display text-xl">Assets ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-ink-soft text-sm">No assets yet.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {items.map((it: any) => (
              <li key={it.id} className="flex items-center justify-between border border-ink/10 rounded-xl px-3 py-2">
                <div>
                  <p className="font-medium text-sm">{it.name}</p>
                  <p className="text-xs text-ink-soft">{it.value}</p>
                </div>
                <button className="text-clay text-xs hover:underline" onClick={() => remove(it.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function EstateForm({ onAdd }: { onAdd: (n: string, v: string) => void }) {
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  return (
    <div className="flex flex-wrap gap-2">
      <input className="border border-ink/20 rounded-lg px-3 py-2 flex-1 min-w-[160px]" placeholder="Asset name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="border border-ink/20 rounded-lg px-3 py-2 flex-1 min-w-[160px]" placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} type="number" />
      <button className="px-4 py-2 bg-pine text-white rounded-lg" onClick={() => { onAdd(name, value); setName(''); setValue('') }}>Add</button>
    </div>
  )
}

