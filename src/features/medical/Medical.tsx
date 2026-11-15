/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { MedicalRepositoryImpl } from '../../data/repositories'
import { Button, Input } from '../../ui/primitives'
import data from '../../content/compendium.json'

const repo = new MedicalRepositoryImpl()

export function Medical() {
  const c = data as any
  const [notes, setNotes] = useState<any[]>([])
  const load = async () => setNotes(await repo.getAll())
  useEffect(() => { load() }, [])

  const add = async (title: string, body: string) => { if (!title) return; await repo.save({ id: crypto.randomUUID(), title, body, date: new Date().toISOString().slice(0, 10) }); load() }
  const remove = async (id: string) => { await repo.delete(id); load() }

  return (
    <div className="p-6 pb-24 md:pb-6 space-y-4 text-ink">
      <h1 className="font-display text-2xl">Medical</h1>
      <MedicalNotes notes={notes} onAdd={add} onRemove={remove} />
      <pre className="text-xs whitespace-pre-wrap bg-white border rounded p-4">{JSON.stringify(c.medical ?? {}, null, 2).slice(0, 2000)}</pre>
    </div>
  )
}

function MedicalNotes({ notes, onAdd, onRemove }: { notes: any[]; onAdd: (t: string, b: string) => void; onRemove: (id: string) => void }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  return (
    <div className="bg-white border border-ink/10 rounded-xl p-4 space-y-2">
      <div className="flex gap-2">
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} />
        <Button onClick={() => { onAdd(title, body); setTitle(''); setBody('') }}>Add</Button>
      </div>
      <ul className="text-sm space-y-1">
        {notes.map((n: any) => <li key={n.id} className="flex justify-between"><span>{n.title}</span><Button variant="ghost" className="text-clay" onClick={() => onRemove(n.id)}>Delete</Button></li>)}
      </ul>
    </div>
  )
}
