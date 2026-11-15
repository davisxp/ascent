import data from '../../content/compendium.json'
export function Grooming() {
  const c = data as any
  return (
    <div style={{ padding: 24, display: 'grid', gap: 16 }}>
      <h1>Grooming</h1>
      <p>Skin: {c.grooming?.skin?.Classification} · {c.grooming?.skin?.['Fitzpatrick Type']}</p>
      <h3>AM</h3>
      <ul>{(c.grooming?.am ?? []).map((s: any, i: number) => <li key={i}>{s.step}: {(s.items ?? []).join(', ')}</li>)}</ul>
      <h3>PM</h3>
      <ul>{(c.grooming?.pm ?? []).map((s: any, i: number) => <li key={i}>{s.step}: {(s.items ?? []).join(', ')}</li>)}</ul>
      <h3>Biweekly</h3>
      <ul>{(c.grooming?.biweekly ?? []).map((b: any, i: number) => <li key={i}>{b.name}{b.on ? ' (on)' : ''}{b.note ? ` — ${b.note}` : ''}</li>)}</ul>
      <h3>Fragrances</h3>
      <ul>{(c.grooming?.fragrances ?? []).map((f: any, i: number) => <li key={i}>{f.season} {f.time}: {f.name}{f.owned ? ' (owned)' : ''}</li>)}</ul>
    </div>
  )
}
