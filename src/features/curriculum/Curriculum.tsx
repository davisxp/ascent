import data from '../../content/compendium.json'
export function Curriculum() {
  const c = data as any
  return (
    <div style={{ padding: 24, display: 'grid', gap: 16 }}>
      <h1>Curriculum</h1>
      <h2>STEM</h2>
      {(c.curriculum?.stem?.parts ?? []).map((p: any, i: number) => (
        <details key={i} style={{ marginBottom: 8 }}>
          <summary>{p.title} ({p.items?.length ?? 0})</summary>
          <ul>{(p.items ?? []).map((it: string, j: number) => <li key={j}>{it}</li>)}</ul>
        </details>
      ))}
      <h2>Humanities</h2>
      {(c.curriculum?.humanities?.parts ?? []).map((p: any, i: number) => (
        <details key={i} style={{ marginBottom: 8 }}>
          <summary>{p.title} ({p.items?.length ?? 0})</summary>
          <ul>{(p.items ?? []).map((it: string, j: number) => <li key={j}>{it}</li>)}</ul>
        </details>
      ))}
    </div>
  )
}
