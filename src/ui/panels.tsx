/**
 * Presentational building blocks shared by the financial screens.
 * Design-system layer only: no feature logic, no persistence.
 */

import { type ReactNode } from 'react'
import { clamp } from './format'

export type Tone = 'pine' | 'clay' | 'marigold' | 'ink' | 'teal' | 'neutral'

const toneText: Record<Tone, string> = {
  pine: 'text-pine',
  clay: 'text-clay-deep',
  marigold: 'text-marigold-deep',
  ink: 'text-ink',
  teal: 'text-teal',
  neutral: 'text-ink/70',
}

const toneFill: Record<Tone, string> = {
  pine: 'var(--color-pine)',
  clay: 'var(--color-clay)',
  marigold: 'var(--color-marigold)',
  ink: 'var(--color-ink)',
  teal: 'var(--color-teal)',
  neutral: 'var(--color-border)',
}

export const Panel = ({
  title,
  sub,
  right,
  children,
  className = '',
}: {
  title: string
  sub?: string
  right?: ReactNode
  children: ReactNode
  className?: string
}) => (
  <section
    className={`rounded-[14px] border border-ink/10 bg-white p-4 shadow-soft min-w-0 ${className}`}
  >
    <header className="flex items-start justify-between gap-3 mb-3">
      <div className="min-w-0">
        <h2 className="font-display text-lg leading-tight">{title}</h2>
        {sub && <p className="text-[11px] uppercase tracking-widest font-mono text-ink/70 mt-1">{sub}</p>}
      </div>
      {right}
    </header>
    {children}
  </section>
)

export const Stat = ({
  label,
  value,
  sub,
  tone = 'ink',
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: Tone
}) => (
  <div className="rounded-[14px] border border-ink/10 bg-white p-4 shadow-soft">
    <p className="text-[11px] uppercase tracking-widest font-mono text-ink/70">{label}</p>
    <p className={`font-mono text-2xl mt-2 leading-none ${toneText[tone]}`}>{value}</p>
    {sub && <p className="text-xs text-ink/70 mt-2">{sub}</p>}
  </div>
)

export const Bar = ({
  value,
  tone = 'pine',
  slim = false,
  label,
}: {
  value: number
  tone?: Tone
  slim?: boolean
  label?: string
}) => (
  <div
    role={label ? 'img' : undefined}
    aria-label={label}
    className={`w-full rounded-full bg-ink/10 overflow-hidden ${slim ? 'h-1.5' : 'h-2'}`}
  >
    <div
      className="h-full rounded-full transition-[width] duration-300"
      style={{ width: `${clamp(value, 0, 100).toFixed(2)}%`, backgroundColor: toneFill[tone] }}
    />
  </div>
)

export const EditToggle = ({
  editing,
  onToggle,
}: {
  editing: boolean
  onToggle: () => void
}) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={editing}
    className={`inline-flex min-h-11 items-center gap-2 rounded-[14px] border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine ${
      editing
        ? 'border-pine bg-pine text-white'
        : 'border-ink/20 bg-white text-ink hover:bg-ink/5'
    }`}
  >
    <span aria-hidden="true">{editing ? '✓' : '✎'}</span>
    {editing ? 'Done editing' : 'Edit'}
  </button>
)

export const NumberField = ({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  prefix,
  suffix,
  ariaLabel,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
  prefix?: string
  suffix?: string
  ariaLabel?: string
}) => (
  <label className="block min-w-0">
    <span className="block text-[10px] uppercase tracking-widest font-mono text-ink/70 mb-1">
      {label}
    </span>
    <span className="flex items-center gap-1 border-b border-marigold/60 py-1 focus-within:border-pine">
      {prefix && <span className="text-ink/70 text-sm">{prefix}</span>}
      <input
        type="number"
        aria-label={ariaLabel ?? label}
        className="w-full min-w-0 bg-transparent font-mono text-sm outline-none"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        min={min}
        max={max}
        onChange={(event) => {
          const next = event.target.valueAsNumber
          onChange(Number.isFinite(next) ? next : 0)
        }}
      />
      {suffix && <span className="text-ink/70 text-xs">{suffix}</span>}
    </span>
  </label>
)

/** Compact text input used for row names while editing. */
export const TextField = ({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) => (
  <label className="block min-w-0">
    <span className="block text-[10px] uppercase tracking-widest font-mono text-ink/70 mb-1">
      {label}
    </span>
    <input
      type="text"
      aria-label={label}
      className="w-full min-w-0 border-b border-marigold/60 bg-transparent py-1 text-sm outline-none focus:border-pine"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </label>
)

/** Inline text input for dense tables — the accessible name is not drawn. */
export const CompactText = ({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) => (
  <input
    type="text"
    aria-label={label}
    className="w-full min-w-0 border-b border-marigold/60 bg-transparent py-1 text-sm outline-none focus:border-pine"
    value={value}
    onChange={(event) => onChange(event.target.value)}
  />
)

export const RowButton = ({
  onClick,
  children,
  label,
  tone = 'neutral',
}: {
  onClick: () => void
  children: ReactNode
  label: string
  tone?: Tone
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-[10px] px-2 text-sm transition-colors hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine ${toneText[tone]}`}
  >
    {children}
  </button>
)
