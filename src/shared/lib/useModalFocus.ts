import { useEffect, useLayoutEffect, useRef } from 'react'

/** Keyboard behavior for the remaining section-based modal forms. */
export function useModalFocus(onClose: () => void, pending = false) {
  const ref = useRef<HTMLElement>(null)
  const returnFocus = useRef(document.activeElement as HTMLElement | null)
  const actions = useRef({ onClose, pending })
  useLayoutEffect(() => { actions.current = { onClose, pending } }, [onClose, pending])
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('*')).filter(node => node.tabIndex >= 0 && !node.matches(':disabled') && !node.closest('[hidden], [inert]') && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden')
    const previous = returnFocus.current
    if (!dialog.contains(document.activeElement)) focusable()[0]?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!actions.current.pending) actions.current.onClose() }
      if (event.key !== 'Tab') return
      const items = focusable(), first = items[0], last = items.at(-1)
      if (!first) { event.preventDefault(); return }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    dialog.addEventListener('keydown', keydown)
    return () => { dialog.removeEventListener('keydown', keydown); if (previous?.isConnected) previous.focus({ preventScroll: true }) }
  }, [])
  return ref
}
