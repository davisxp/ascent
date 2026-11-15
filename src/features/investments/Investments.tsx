import data from '../../content/compendium.json'
export function Investments() {
  const c = data as any
  const inv = c.investments ?? {}
  return (
    <div style={{ padding: 24, display: 'grid', gap: 16 }}>
      <h1>Investments</h1>
      <p>NAV: {inv.nav} · Invested: {inv.investedSum}</p>
      <ul>{(inv.accounts ?? []).map((a: any, i: number) => <li key={i}>{a.name}: value {a.value} invested {a.invested} monthly {a.monthly}</li>)}</ul>
    </div>
  )
}
