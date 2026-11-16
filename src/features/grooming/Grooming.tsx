/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { GroomingRepositoryImpl } from '../../data/repositories'
import { Button, Input } from '../../ui/primitives'
import data from '../../content/compendium.json'

const repo = new GroomingRepositoryImpl()

export function Grooming() {
  const c = data as any
  const [routines, setRoutines] = useState<any[]>([])
  const load = async () => setRoutines(await repo.getAll())
  useEffect(() => { load() }, [])

  const add = async (title: string, period: 'am' | 'pm') => { if (!title) return; await repo.save({ id: crypto.randomUUID(), title, period, steps: [] }); load() }
  const remove = async (id: string) => { await repo.delete(id); load() }

  return (
    <div className="p-6 pb-24 md:pb-6 space-y-4 text-ink">
      <h1 className="font-display text-2xl">Grooming</h1>
      <GroomingRoutines routines={routines} onAdd={add} onRemove={remove} />
      {c.grooming?.skin?.Classification && (
        <p className="text-sm text-ink/60">
          Skin: {c.grooming.skin.Classification}
          {c.grooming.skin['Fitzpatrick Type'] ? ` · ${c.grooming.skin['Fitzpatrick Type']}` : ''}
        </p>
      )}
    </div>
  )
}

function GroomingRoutines({ routines, onAdd, onRemove }: { routines: any[]; onAdd: (t: string, p: 'am' | 'pm') => void; onRemove: (id: string) => void }) {
  const [title, setTitle] = useState('')
  const [period, setPeriod] = useState<'am' | 'pm'>('am')
  return (
    <div className="bg-white border border-ink/10 rounded-xl p-4 space-y-2">
      <div className="flex gap-2">
        <Input placeholder="Routine" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select className="border rounded px-2 py-1" value={period} onChange={(e) => setPeriod(e.target.value as 'am' | 'pm')}>
          <option value="am">AM</option>
          <option value="pm">PM</option>
        </select>
        <Button onClick={() => { onAdd(title, period); setTitle('') }}>Add</Button>
      </div>
      <ul className="text-sm space-y-1">
        {routines.map((rt: any) => <li key={rt.id} className="flex justify-between"><span>{rt.title} — {rt.period}</span><Button variant="ghost" className="text-clay" onClick={() => onRemove(rt.id)}>Delete</Button></li>)}
      </ul>
    </div>
  )
}
