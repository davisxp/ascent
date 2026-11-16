/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { CareerRepositoryImpl } from '../../data/repositories'
import { Button, Input } from '../../ui/primitives'
import data from '../../content/compendium.json'

const repo = new CareerRepositoryImpl()

export function Career() {
  const c = data as any
  const panels = (c.career?.panels ?? []) as string[]
  const [goals, setGoals] = useState<any[]>([])
  const load = async () => setGoals(await repo.getAll())
  useEffect(() => { load() }, [])

  const add = async (title: string) => { if (!title) return; await repo.save({ id: crypto.randomUUID(), title, status: 'active' }); load() }
  const remove = async (id: string) => { await repo.delete(id); load() }

  return (
    <div className="p-6 space-y-6 text-ink max-w-4xl mx-auto">
      <header className="space-y-1">
        <h1 className="font-display text-3xl">Career</h1>
        <p className="text-ink-soft text-sm">Panels: {panels.join(' · ')}</p>
      </header>

      <section className="bg-white border border-ink/10 rounded-2xl p-5 space-y-3 shadow-sm">
        <h2 className="font-display text-xl">Goals</h2>
        <CareerGoals goals={goals} onAdd={add} onRemove={remove} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {panels.filter((p) => p !== 'Goals').map((p, i) => (
          <div key={i} className="bg-white border border-ink/10 rounded-2xl p-4 shadow-sm">
            <h3 className="font-display text-lg">{p}</h3>
          </div>
        ))}
      </section>
    </div>
  )
}

function CareerGoals({ goals, onAdd, onRemove }: { goals: any[]; onAdd: (t: string) => void; onRemove: (id: string) => void }) {
  const [title, setTitle] = useState('')
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input className="flex-1 h-11" placeholder="New goal" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Button onClick={() => { onAdd(title); setTitle('') }} className="h-11">Add</Button>
      </div>
      <ul className="text-sm space-y-1">
        {goals.map((g: any) => <li key={g.id} className="flex justify-between border border-ink/10 rounded-lg px-3 py-2"><span>{g.title} — {g.status}</span><Button variant="ghost" className="text-clay" onClick={() => onRemove(g.id)}>Delete</Button></li>)}
      </ul>
    </div>
  )
}