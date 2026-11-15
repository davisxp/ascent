/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { NetworkRepositoryImpl } from '../../data/repositories'
import data from '../../content/compendium.json'

const repo = new NetworkRepositoryImpl()

export function Network() {
  const c = data as any
  const [contacts, setContacts] = useState<any[]>([])
  const load = async () => setContacts(await repo.getAll())
  useEffect(() => { load() }, [])

  const add = async (name: string) => { if (!name) return; await repo.save({ id: crypto.randomUUID(), name }); load() }
  const remove = async (id: string) => { await repo.delete(id); load() }

  return (
    <div className="p-6 space-y-4 text-ink">
      <h1 className="font-display text-2xl">Network</h1>
      <NetworkContacts contacts={contacts} onAdd={add} onRemove={remove} />
      <pre className="text-xs whitespace-pre-wrap bg-white border rounded p-4">{JSON.stringify(c.network ?? {}, null, 2).slice(0, 2000)}</pre>
    </div>
  )
}

function NetworkContacts({ contacts, onAdd, onRemove }: { contacts: any[]; onAdd: (n: string) => void; onRemove: (id: string) => void }) {
  const [name, setName] = useState('')
  return (
    <div className="bg-white border border-ink/10 rounded-xl p-4 space-y-2">
      <div className="flex gap-2">
        <input className="border rounded px-2 py-1" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="px-3 py-1 bg-pine text-white rounded" onClick={() => { onAdd(name); setName('') }}>Add</button>
      </div>
      <ul className="text-sm space-y-1">
        {contacts.map((ct: any) => <li key={ct.id} className="flex justify-between"><span>{ct.name}</span><button className="text-clay" onClick={() => onRemove(ct.id)}>Delete</button></li>)}
      </ul>
    </div>
  )
}
