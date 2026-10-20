import { cloneElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactElement } from 'react'
import { createPortal } from 'react-dom'
import './tooltip.css'

let lastClosedAt = 0

/** Noninteractive hint: stays outside scroll containers and never intercepts a click. */
export function Tooltip({ content, children }: {
  content: string
  children: ReactElement<{ 'aria-describedby'?: string }>
}) {
  const id = useId()
  const anchor = useRef<HTMLSpanElement>(null), bubble = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [host, setHost] = useState<Element | null>(null)
  const open = host !== null
  const show = useCallback(() => setHost(anchor.current?.closest('dialog[open]') ?? document.body), [])
  const clearTimer = useCallback(() => { clearTimeout(timer.current); timer.current = undefined }, [])
  const close = useCallback(() => {
    clearTimer()
    setHost(null)
    lastClosedAt = Date.now()
  }, [clearTimer])

  useEffect(() => clearTimer, [clearTimer])
  useLayoutEffect(() => {
    if (!open || !anchor.current || !bubble.current) return
    const trigger = anchor.current.getBoundingClientRect(), tooltip = bubble.current
    const controls = anchor.current.closest('[data-tooltip-group], .section-tool-icon-grid')?.getBoundingClientRect() ?? trigger
    const box = tooltip.getBoundingClientRect(), gap = 9, edge = 10
    const above = controls.top >= box.height + gap + edge
    const left = Math.max(edge, Math.min(window.innerWidth - box.width - edge, trigger.left + (trigger.width - box.width) / 2))
    const top = above ? controls.top - box.height - gap : Math.min(window.innerHeight - box.height - edge, controls.bottom + gap)
    tooltip.style.left = `${left}px`
    tooltip.style.top = `${Math.max(edge, top)}px`
    tooltip.style.setProperty('--tooltip-arrow-x', `${Math.max(12, Math.min(box.width - 12, trigger.left + trigger.width / 2 - left))}px`)
    tooltip.dataset.side = above ? 'top' : 'bottom'
    tooltip.style.visibility = 'visible'
  }, [open, content])
  useEffect(() => {
    if (!open) return
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
    }
    document.addEventListener('keydown', escape, true)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('keydown', escape, true)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open, close])

  return <span ref={anchor} className="ui-tooltip-trigger"
    onPointerEnter={event => {
      if (event.pointerType === 'touch') return
      clearTimer()
      timer.current = setTimeout(show, Date.now() - lastClosedAt < 500 ? 40 : 150)
    }}
    onPointerLeave={close} onPointerDown={close}
    onFocus={event => { if ((event.target as HTMLElement).matches(':focus-visible')) { clearTimer(); show() } }}
    onBlur={close}>
    {cloneElement(children, { 'aria-describedby': open ? [children.props['aria-describedby'], id].filter(Boolean).join(' ') : children.props['aria-describedby'] })}
    {host && createPortal(<div ref={bubble} id={id} role="tooltip" className="ui-tooltip">{content}</div>, host)}
  </span>
}
