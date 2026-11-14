/**
 * UI primitives — design-system layer.
 * No feature logic. WCAG AA: 44px targets, visible focus rings.
 */

import { type ComponentPropsWithoutRef, forwardRef } from 'react'

export const Button = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<'button'> & { variant?: 'primary' | 'outline' | 'ghost' }
>(({ className = '', variant = 'primary', disabled, ...props }, ref) => {
  const base =
    'inline-flex items-center justify-center rounded-[14px] border border-transparent px-4 py-2.5 text-sm font-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
  const variants: Record<string, string> = {
    primary: 'bg-pine text-white hover:bg-pine-soft',
    outline: 'border-ink hover:bg-ink/5',
    ghost: 'hover:bg-ink/5',
  }
  return (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled}
      type="button"
      {...props}
    />
  )
})
Button.displayName = 'Button'

export const Card = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<'div'>
>(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`rounded-[14px] bg-white border border-ink/10 shadow-soft p-4 ${className}`}
    {...props}
  />
))
Card.displayName = 'Card'

export const Input = forwardRef<
  HTMLInputElement,
  ComponentPropsWithoutRef<'input'>
>(({ className = '', ...props }, ref) => (
  <input
    ref={ref}
    className={`rounded-[8px] border border-ink/20 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine ${className}`}
    {...props}
  />
))
Input.displayName = 'Input'

export const Checkbox = forwardRef<
  HTMLInputElement,
  ComponentPropsWithoutRef<'input'> & { label?: string }
>(({ className = '', label, ...props }, ref) => (
  <label className={`inline-flex items-center gap-2 cursor-pointer ${className}`}>
    <input
      ref={ref}
      type="checkbox"
      className={`rounded-[6px] border border-ink/20 text-pine bg-white focus-visible:ring-2 focus-visible:ring-pine`}
      {...props}
    />
    {label && <span className="text-sm">{label}</span>}
  </label>
))
Checkbox.displayName = 'Checkbox'

export const Badge = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<'span'> & { variant?: 'success' | 'warn' | 'danger' | 'info' | 'pine' }
>(({ className = '', variant = 'pine', ...props }, ref) => {
  const variants: Record<string, string> = {
    pine: 'bg-pine text-white',
    success: 'bg-pine text-white',
    warn: 'bg-marigold text-ink',
    danger: 'bg-clay text-white',
    info: 'bg-teal text-white',
  }
  return (
    <span
      ref={ref}
      className={`inline-flex items-center rounded-[8px] px-2 py-0.5 text-[11px] font-mono uppercase tracking-tighter ${variants[variant]} ${className}`}
      {...props}
    />
  )
})
Badge.displayName = 'Badge'

export const Ring = forwardRef<
  SVGSVGElement,
  { value: number; max: number; size?: number; color?: string; label?: string; className?: string }
>(({ value, max, size = 60, color = 'pine', label, className = '' }, ref) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const circumference = 2 * Math.PI * 22
  const strokeDashoffset = ((100 - pct) / 100) * circumference
  return (
    <svg
      ref={ref}
      className={`shrink-0 ${className}`}
      width={size}
      height={size}
      role="img"
      aria-label={label ?? `${Math.round(pct)}%`}
    >
      <circle
        cx="50%"
        cy="50%"
        r="22"
        fill="none"
        stroke="ink/10"
        strokeWidth="8"
      />
      <circle
        cx="50%"
        cy="50%"
        r="22"
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        className="transition-all duration-500"
      />
    </svg>
  )
})
Ring.displayName = 'Ring'

export const Toast = forwardRef<
  HTMLDivElement,
  { open: boolean; message: string; onClose: () => void; kind?: 'info' | 'success' | 'warn' | 'danger'; className?: string }
>(({ open, message, onClose, kind = 'info', className = '' }, ref) => {
  if (!open) return null
  const kinds: Record<string, string> = {
    info: 'bg-ink text-white',
    success: 'bg-pine text-white',
    warn: 'bg-marigold text-ink',
    danger: 'bg-clay text-white',
  }
  return (
    <div
      ref={ref}
      role="alert"
      aria-live="polite"
      className={`fixed bottom-4 right-4 rounded-[14px] px-4 py-3 shadow-card z-50 ${kinds[kind]} ${className}`}
    >
      <span className="text-sm">{message}</span>
      <Button
        variant="ghost"
        className="ml-2 h-6 w-6 p-0 text-white opacity-70 hover:opacity-100"
        onClick={onClose}
      >
        ✕
      </Button>
    </div>
  )
})
Toast.displayName = 'Toast'
