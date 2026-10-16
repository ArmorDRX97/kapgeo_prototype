import { useLayoutEffect, useRef, type PropsWithChildren, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from './Button'
import './filter-popover.css'

export function FilterPopover({ id, title, anchor, onClose, children, footer, wide = false }: PropsWithChildren<{
  id: string
  title: string
  anchor: RefObject<HTMLButtonElement | null>
  onClose: () => void
  footer: ReactNode
  wide?: boolean
}>) {
  const panel = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const popup = panel.current
    const trigger = anchor.current
    if (!popup || !trigger) return
    const place = () => {
      const viewport = window.visualViewport
      const leftEdge = viewport?.offsetLeft ?? 0, topEdge = viewport?.offsetTop ?? 0
      const viewportWidth = viewport?.width ?? window.innerWidth, viewportHeight = viewport?.height ?? window.innerHeight
      const tokens = getComputedStyle(document.documentElement)
      const margin = parseFloat(tokens.getPropertyValue('--space-3')) || 12
      const gap = parseFloat(tokens.getPropertyValue('--space-2')) || 8
      const width = Math.min(wide ? 520 : 340, viewportWidth - margin * 2)
      const rect = trigger.getBoundingClientRect()
      const right = leftEdge + viewportWidth - margin, bottom = topEdge + viewportHeight - margin
      const beside = rect.right + gap + width <= right ? rect.right + gap : rect.left - gap - width >= leftEdge + margin ? rect.left - gap - width : right - width
      // Keep a usable body when the trigger is low; constrain height from the
      // actual top, rather than allowing top + 100vh to overflow the viewport.
      const top = Math.max(topEdge + margin, Math.min(rect.top, bottom - Math.min(240, viewportHeight - margin * 2)))
      popup.style.left = `${Math.max(leftEdge + margin, beside)}px`
      popup.style.top = `${top}px`
      popup.style.width = `${width}px`
      popup.style.maxHeight = `${Math.max(0, bottom - top)}px`
    }
    place()
    ;(popup.querySelector<HTMLElement>('select, input') ?? popup.querySelector<HTMLElement>('button'))?.focus({ preventScroll: true })
    const outside = (event: PointerEvent | FocusEvent) => {
      if (!popup.contains(event.target as Node) && !trigger.contains(event.target as Node)) onClose()
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      onClose()
      trigger.focus({ preventScroll: true })
    }
    const scroll = (event: Event) => { if (!popup.contains(event.target as Node)) place() }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', outside)
    document.addEventListener('keydown', escape, true)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', scroll, true)
    window.visualViewport?.addEventListener('resize', place)
    window.visualViewport?.addEventListener('scroll', place)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('focusin', outside)
      document.removeEventListener('keydown', escape, true)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', scroll, true)
      window.visualViewport?.removeEventListener('resize', place)
      window.visualViewport?.removeEventListener('scroll', place)
    }
  }, [anchor, onClose, wide])
  return createPortal(<div ref={panel} id={id} role="dialog" aria-label={title} className={`filter-popover${wide ? ' filter-popover--wide' : ''}`}>
    <header><strong>{title}</strong><Button variant="quiet" size="sm" aria-label={`Закрыть ${title.toLocaleLowerCase('ru')}`} onClick={() => { onClose(); anchor.current?.focus({ preventScroll: true }) }}><X size={16} /></Button></header>
    <div className="filter-popover__body"><div className="filter-popover__fields">{children}</div></div>
    <footer>{footer}</footer>
  </div>, document.body)
}
