/* eslint-disable @typescript-eslint/no-explicit-any */
import data from '../../content/compendium.json'
export function Estate() {
  const c = data as any
  const e = c.estate ?? {}
  return (
    <div style={{ padding: 24, display: 'grid', gap: 16 }}>
      <h1>Estate & Home</h1>
      <p>{e.note}</p>
      <h3>Household</h3>
      <ul>{(e.household ?? []).map((h: string, i: number) => <li key={i}>{h}</li>)}</ul>
      <h3>Documents</h3>
      <ul>{(e.documents ?? []).map((d: string, i: number) => <li key={i}>{d}</li>)}</ul>
    </div>
  )
}

