/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { EstateRepositoryImpl } from '../../data/repositories'
import { Button, Input } from '../../ui/primitives'
import data from '../../content/compendium.json'

const repo = new EstateRepositoryImpl()

export function Estate() {
  const c = data as any
  const [items, setItems] = useState<any[]>([])
  const load = async () => setItems(await repo.getAll())
  useEffect(() => { load() }, [])

  const add = async (name: string, value: string) => { if (!name) return; await repo.save({ id: crypto.randomUUID(), name, value: Number(value) || 0 }); load() }
  const remove = async (id: string) => { await repo.delete(id); load() }

  return (
    <div className="p-6 pb-24 md:pb-6 space-y-4 text-ink">
      <h1 className="font-display text-2xl">Estate</h1>
      <EstateItems items={items} onAdd={add} onRemove={remove} />
      <pre className="text-xs whitespace-pre-wrap bg-white border rounded p-4">{JSON.stringify(c.estate ?? {}, null, 2).slice(0, 2000)}</pre>
    </div>
  )
}

function EstateItems({ items, onAdd, onRemove }: { items: any[]; onAdd: (n: string, v: string) => void; onRemove: (id: string) => void }) {
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  return (
    <div className="bg-white border border-ink/10 rounded-xl p-4 space-y-2">
      <div className="flex gap-2">
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} type="number" />
        <Button onClick={() => { onAdd(name, value); setName(''); setValue('') }}>Add</Button>
      </div>
      <ul className="text-sm space-y-1">
        {items.map((it: any) => <li key={it.id} className="flex justify-between"><span>{it.name} — {it.value}</span><Button variant="ghost" className="text-clay" onClick={() => onRemove(it.id)}>Delete</Button></li>)}
      </ul>
    </div>
  )
}
