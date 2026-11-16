/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { NetworkRepositoryImpl } from '../../data/repositories'

const repo = new NetworkRepositoryImpl()

export function Network() {
  const [contacts, setContacts] = useState<any[]>([])
  const load = async () => setContacts(await repo.getAll())
  useEffect(() => { load() }, [])

  const add = async (name: string, relation: string) => { if (!name) return; await repo.save({ id: crypto.randomUUID(), name, relation: relation || undefined }); load() }
  const remove = async (id: string) => { await repo.delete(id); load() }

  return (
    <div className="p-6 space-y-6 text-ink max-w-4xl mx-auto">
      <header className="space-y-1">
        <h1 className="font-display text-3xl">Network</h1>
        <p className="text-ink-soft text-sm">Contacts and relationships.</p>
      </header>

      <section className="bg-white border border-ink/10 rounded-2xl p-5 space-y-3 shadow-sm">
        <h2 className="font-display text-xl">Add contact</h2>
        <NetworkForm onAdd={add} />
      </section>

      <section className="bg-white border border-ink/10 rounded-2xl p-5 space-y-3 shadow-sm">
        <h2 className="font-display text-xl">Contacts ({contacts.length})</h2>
        {contacts.length === 0 ? (
          <p className="text-ink-soft text-sm">No contacts yet.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {contacts.map((ct: any) => (
              <li key={ct.id} className="flex items-center justify-between border border-ink/10 rounded-xl px-3 py-2">
                <div>
                  <p className="font-medium text-sm">{ct.name}</p>
                  {ct.relation && <p className="text-xs text-ink-soft">{ct.relation}</p>}
                </div>
                <button className="text-clay text-xs hover:underline" onClick={() => remove(ct.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function NetworkForm({ onAdd }: { onAdd: (n: string, r: string) => void }) {
  const [name, setName] = useState('')
  const [relation, setRelation] = useState('')
  return (
    <div className="flex flex-wrap gap-2">
      <input className="border border-ink/20 rounded-lg px-3 py-2 flex-1 min-w-[160px]" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="border border-ink/20 rounded-lg px-3 py-2 flex-1 min-w-[160px]" placeholder="Relation" value={relation} onChange={(e) => setRelation(e.target.value)} />
      <button className="px-4 py-2 bg-pine text-white rounded-lg" onClick={() => { onAdd(name, relation); setName(''); setRelation('') }}>Add</button>
    </div>
  )
}

