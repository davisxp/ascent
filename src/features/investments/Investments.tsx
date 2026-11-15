/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { InvestmentRepositoryImpl } from '../../data/repositories'
import data from '../../content/compendium.json'

const repo = new InvestmentRepositoryImpl()

export function Investments() {
  const c = data as any
  const [items, setItems] = useState<any[]>([])
  const load = async () => setItems(await repo.getAll())
  useEffect(() => { load() }, [])

  const add = async (name: string, value: string) => { if (!name) return; await repo.save({ id: crypto.randomUUID(), name, value: Number(value) || 0, kind: 'asset', updatedAt: new Date().toISOString() }); load() }
  const remove = async (id: string) => { await repo.delete(id); load() }

  return (
    <div className="p-6 space-y-4 text-ink">
      <h1 className="font-display text-2xl">Investments</h1>
      <InvestmentItems items={items} onAdd={add} onRemove={remove} />
      <pre className="text-xs whitespace-pre-wrap bg-white border rounded p-4">{JSON.stringify(c.investments ?? {}, null, 2).slice(0, 2000)}</pre>
    </div>
  )
}

function InvestmentItems({ items, onAdd, onRemove }: { items: any[]; onAdd: (n: string, v: string) => void; onRemove: (id: string) => void }) {
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  return (
    <div className="bg-white border border-ink/10 rounded-xl p-4 space-y-2">
      <div className="flex gap-2">
        <input className="border rounded px-2 py-1" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="border rounded px-2 py-1" placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} type="number" />
        <button className="px-3 py-1 bg-pine text-white rounded" onClick={() => { onAdd(name, value); setName(''); setValue('') }}>Add</button>
      </div>
      <ul className="text-sm space-y-1">
        {items.map((it: any) => <li key={it.id} className="flex justify-between"><span>{it.name} — {it.value}</span><button className="text-clay" onClick={() => onRemove(it.id)}>Delete</button></li>)}
      </ul>
    </div>
  )
}
