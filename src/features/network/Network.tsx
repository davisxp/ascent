import data from '../../content/compendium.json'
export function Network() {
  const c = data as any
  return <div style={{ padding: 24 }}><h1>Network</h1><p>{(c.network?.fields ?? []).join(', ')}</p></div>
}
