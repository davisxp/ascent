/* eslint-disable @typescript-eslint/no-explicit-any */
import data from '../../content/compendium.json'
export function Medical() {
  const c = data as any
  const b = c.body ?? {}
  return (
    <div style={{ padding: 24, display: 'grid', gap: 16 }}>
      <h1>Medical / Body</h1>
      <h3>Measures</h3>
      <ul>{(b.measures ?? []).map((m: any, i: number) => <li key={i}>{m[0]}: {m[1]}</li>)}</ul>
      <h3>Composition</h3>
      <ul>{(b.composition ?? []).map((m: any, i: number) => <li key={i}>{m[0]}: {m[2]} {m[3]}</li>)}</ul>
    </div>
  )
}

