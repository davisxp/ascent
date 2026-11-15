import data from '../../content/compendium.json'
export function Finances() {
  const c = data as any
  const f = c.finances ?? {}
  return (
    <div style={{ padding: 24, display: 'grid', gap: 16 }}>
      <h1>Finances</h1>
      <p>Gross {f.gross} · Net monthly {f.monthlyNet} · Annual net {f.annualNet}</p>
      <h3>Outgoings</h3>
      <ul>
        {(f.outgoings?.bills ?? []).map((b: any, i: number) => <li key={i}>{b[0]}: {b[1]}</li>)}
        {(f.outgoings?.regular ?? []).map((b: any, i: number) => <li key={i}>{b[0]}: {b[1]}</li>)}
        {(f.outgoings?.savings ?? []).map((b: any, i: number) => <li key={i}>{b[0]}: {b[1]}</li>)}
      </ul>
      <h3>Debts</h3>
      <p>Total: {f.debts?.total}</p>
      <ul>{(f.debts?.loans ?? []).map((d: any, i: number) => <li key={i}>{d[0]}: {d[1]} @ {d[2]}</li>)}</ul>
    </div>
  )
}
