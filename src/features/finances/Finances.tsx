/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { FinanceRepositoryImpl } from '../../data/repositories'
import data from '../../content/compendium.json'

const repo = new FinanceRepositoryImpl()

export function Finances() {
  const c = data as any
  const f = c.finances ?? {}
  const [entries, setEntries] = useState<any[]>([])
  const load = async () => setEntries(await repo.getAll())
  useEffect(() => { load() }, [])

  const add = async (title: string, amount: string, kind: 'income' | 'expense') => {
    if (!title || !amount) return
    await repo.save({ id: crypto.randomUUID(), name: title, amount: Number(amount), kind, date: new Date().toISOString().slice(0, 10) })
    load()
  }
  const remove = async (id: string) => { await repo.delete(id); load() }

  return (
    <div className="p-6 space-y-6 text-ink">
      <h1 className="font-display text-2xl">Finances</h1>
      <div className="grid gap-2 text-sm">
        <p>Gross {f.gross} · Tax-free {f.taxFree} · Taxable {f.taxable}</p>
        <p>Tax {f.tax} · NI {f.ni} · Pension {f.pension} · Loan {f.loan}</p>
        <p>Annual net {f.annualNet} · Monthly net {f.monthlyNet}</p>
      </div>
      <FinanceEntries entries={entries} onAdd={add} onRemove={remove} />
    </div>
  )
}

function FinanceEntries({ entries, onAdd, onRemove }: { entries: any[]; onAdd: (t: string, a: string, k: 'income' | 'expense') => void; onRemove: (id: string) => void }) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [kind, setKind] = useState<'income' | 'expense'>('expense')
  return (
    <div className="bg-white border border-ink/10 rounded-xl p-4 space-y-2">
      <p className="font-medium">Entries</p>
      <div className="flex gap-2">
        <input className="border rounded px-2 py-1" placeholder="Name" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="border rounded px-2 py-1" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" />
        <select className="border rounded px-2 py-1" value={kind} onChange={(e) => setKind(e.target.value as any)}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <button className="px-3 py-1 bg-pine text-white rounded" onClick={() => { onAdd(title, amount, kind); setTitle(''); setAmount('') }}>Add</button>
      </div>
      <ul className="text-sm space-y-1">
        {entries.map((e: any) => (
          <li key={e.id} className="flex justify-between">
            <span>{e.name} — {e.kind} {e.amount}</span>
            <button className="text-clay" onClick={() => onRemove(e.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
