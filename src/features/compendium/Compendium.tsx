/* eslint-disable @typescript-eslint/no-explicit-any */
import data from '../../content/compendium.json'

export function Compendium() {
  const c = data as any
  return (
    <div style={{ padding: 24, display: 'grid', gap: 32 }}>
      <h1>Compendium</h1>

      <section>
        <h2>Wardrobe</h2>
        <p>{c.wardrobe?.totals?.owned ?? 0} owned · {c.wardrobe?.totals?.restoration ?? 0} restoration · {c.wardrobe?.totals?.missing ?? 0} missing</p>
        {(c.wardrobe?.categories ?? []).map((cat: any) => (
          <details key={cat.name} style={{ marginBottom: 8 }}>
            <summary>{cat.name} ({cat.items?.length ?? 0})</summary>
            <ul>
              {(cat.items ?? []).map((it: any, i: number) => (
                <li key={i}>{it.n} — {it.s}</li>
              ))}
            </ul>
          </details>
        ))}
        <p>Sizes: {(c.wardrobe?.sizes ?? []).map((s: any) => `${s[0]}: ${s[1]}`).join(', ')}</p>
      </section>

      <section>
        <h2>Workouts</h2>
        {(c.workouts?.days ?? []).map((d: any) => (
          <div key={d.name} style={{ marginBottom: 12 }}>
            <strong>{d.name}</strong>{d.rest ? ' (rest)' : ''}
            <ul>
              {(d.exercises ?? []).map((e: any, i: number) => (
                <li key={i}>{e.n} — {e.w}kg × {e.r}</li>
              ))}
            </ul>
          </div>
        ))}
        <p>Morning: {c.workouts?.morning?.title}</p>
        <p>Cardio: {c.workouts?.cardio}</p>
      </section>

      <section>
        <h2>Curriculum — STEM</h2>
        {(c.curriculum?.stem?.parts ?? []).map((p: any, i: number) => (
          <details key={i} style={{ marginBottom: 8 }}>
            <summary>{p.title} ({p.items?.length ?? 0})</summary>
            <ul>{(p.items ?? []).map((it: string, j: number) => <li key={j}>{it}</li>)}</ul>
          </details>
        ))}
      </section>

      <section>
        <h2>Curriculum — Humanities</h2>
        {(c.curriculum?.humanities?.parts ?? []).map((p: any, i: number) => (
          <details key={i} style={{ marginBottom: 8 }}>
            <summary>{p.title} ({p.items?.length ?? 0})</summary>
            <ul>{(p.items ?? []).map((it: string, j: number) => <li key={j}>{it}</li>)}</ul>
          </details>
        ))}
      </section>

      <section>
        <h2>Grooming</h2>
        <p>Skin: {c.grooming?.skin?.Classification} · {c.grooming?.skin?.['Fitzpatrick Type']}</p>
        <h3>AM</h3>
        <ul>{(c.grooming?.am ?? []).map((s: any, i: number) => <li key={i}>{s.step}: {(s.items ?? []).join(', ')}</li>)}</ul>
        <h3>PM</h3>
        <ul>{(c.grooming?.pm ?? []).map((s: any, i: number) => <li key={i}>{s.step}: {(s.items ?? []).join(', ')}</li>)}</ul>
      </section>
    </div>
  )
}
