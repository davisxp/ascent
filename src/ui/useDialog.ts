/**
 * Shared dialog a11y hook — focus trap, Escape to close, initial and
 * restored focus. Used by feature-level dialogs (player, swap, detail).
 * No feature logic lives here.
 */

import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select, textarea, a[href], [tabindex]:not([tabindex="-1"])'

export function useDialog(onClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null
    containerRef.current?.focus()
    return () => {
      restoreRef.current?.focus()
    }
  }, [])

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCloseRef.current()
      return
    }
    if (e.key !== 'Tab') return
    const root = containerRef.current
    if (!root) return
    const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null,
    )
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return { containerRef, handleKeyDown }
}
