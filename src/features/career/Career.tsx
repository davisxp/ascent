import data from '../../content/compendium.json'
export function Career() {
  const c = data as any
  return <div style={{ padding: 24 }}><h1>Career</h1><p>{(c.career?.panels ?? []).join(', ')}</p></div>
}
