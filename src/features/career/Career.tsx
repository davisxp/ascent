/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { CareerRepositoryImpl } from '../../data/repositories'
import { Button, Input } from '../../ui/primitives'
import data from '../../content/compendium.json'

const repo = new CareerRepositoryImpl()

export function Career() {
  const c = data as any
  const [goals, setGoals] = useState<any[]>([])
  const load = async () => setGoals(await repo.getAll())
  useEffect(() => { load() }, [])

  const add = async (title: string) => { if (!title) return; await repo.save({ id: crypto.randomUUID(), title, status: 'active' }); load() }
  const remove = async (id: string) => { await repo.delete(id); load() }

  return (
    <div className="p-6 pb-24 md:pb-6 space-y-4 text-ink">
      <h1 className="font-display text-2xl">Career</h1>
      <CareerGoals goals={goals} onAdd={add} onRemove={remove} />
      <pre className="text-xs whitespace-pre-wrap bg-white border rounded p-4">{JSON.stringify(c.career ?? {}, null, 2).slice(0, 2000)}</pre>
    </div>
  )
}

function CareerGoals({ goals, onAdd, onRemove }: { goals: any[]; onAdd: (t: string) => void; onRemove: (id: string) => void }) {
  const [title, setTitle] = useState('')
  return (
    <div className="bg-white border border-ink/10 rounded-xl p-4 space-y-2">
      <div className="flex gap-2">
        <Input placeholder="Goal" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Button onClick={() => { onAdd(title); setTitle('') }}>Add</Button>
      </div>
      <ul className="text-sm space-y-1">
        {goals.map((g: any) => <li key={g.id} className="flex justify-between"><span>{g.title} — {g.status}</span><Button variant="ghost" className="text-clay" onClick={() => onRemove(g.id)}>Delete</Button></li>)}
      </ul>
    </div>
  )
}
