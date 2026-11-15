import data from '../../content/compendium.json'
export function Wardrobe() {
  const c = data as any
  return (
    <div style={{ padding: 24, display: 'grid', gap: 16 }}>
      <h1>Wardrobe</h1>
      <p>{c.wardrobe?.totals?.owned ?? 0} owned · {c.wardrobe?.totals?.restoration ?? 0} restoration · {c.wardrobe?.totals?.missing ?? 0} missing</p>
      {(c.wardrobe?.categories ?? []).map((cat: any) => (
        <details key={cat.name} style={{ marginBottom: 8 }}>
          <summary>{cat.name} ({cat.items?.length ?? 0})</summary>
          <ul>{(cat.items ?? []).map((it: any, i: number) => <li key={i}>{it.n} — {it.s}</li>)}</ul>
        </details>
      ))}
      <p>Sizes: {(c.wardrobe?.sizes ?? []).map((s: any) => `${s[0]}: ${s[1]}`).join(', ')}</p>
    </div>
  )
}
