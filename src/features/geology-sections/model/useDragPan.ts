import { useEffect, useRef, useState, type HTMLAttributes } from 'react'

type Gesture = { move: (dx: number, dy: number) => void; cancel?: () => void }
type Active = { id: number; x: number; y: number; moved: boolean; node: HTMLDivElement; gesture: Gesture }

/** A click selects, a drag pans. Editing tools and handles can own their gesture. */
export function useDragPan(enabled: boolean, start: () => Gesture) {
  const active = useRef<Active | null>(null), suppressClick = useRef(false), timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [panning, setPanning] = useState(false)
  const release = (value: Active) => { if (value.node.hasPointerCapture?.(value.id)) value.node.releasePointerCapture(value.id) }
  const stop = (cancel: boolean) => {
    const value = active.current
    if (!value) return
    active.current = null; release(value)
    if (cancel && value.moved) value.gesture.cancel?.()
    if (value.moved) { suppressClick.current = true; timer.current = setTimeout(() => { suppressClick.current = false }, 0) }
    setPanning(false)
  }
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && active.current) { event.preventDefault(); event.stopPropagation(); const value = active.current; active.current = null; release(value); if (value.moved) value.gesture.cancel?.(); suppressClick.current = value.moved; setPanning(false) } }
    const blur = () => { const value = active.current; if (value) { active.current = null; release(value); if (value.moved) value.gesture.cancel?.(); setPanning(false) } }
    window.addEventListener('keydown', escape, true); window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', escape, true); window.removeEventListener('blur', blur); if (active.current) release(active.current); if (timer.current) clearTimeout(timer.current) }
  }, [])
  const events: HTMLAttributes<HTMLDivElement> = {
    onPointerDown: event => {
      if (!enabled || event.button !== 0 || event.isPrimary === false || (event.target as Element).closest('.section-canvas__drag-handle')) return
      suppressClick.current = false
      active.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, node: event.currentTarget, gesture: start() }
    },
    onPointerMove: event => {
      const value = active.current
      if (!value || event.pointerId !== value.id) return
      const dx = event.clientX - value.x, dy = event.clientY - value.y
      if (!value.moved && Math.hypot(dx, dy) < 5) return
      if (!value.moved) { value.moved = true; value.node.setPointerCapture?.(event.pointerId); setPanning(true) }
      event.preventDefault(); value.gesture.move(dx, dy)
    },
    onPointerUp: event => { if (active.current?.id === event.pointerId) stop(false) },
    onPointerCancel: () => stop(true), onLostPointerCapture: () => { if (active.current?.moved) stop(true) },
    onClickCapture: event => { if (suppressClick.current && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false } },
  }
  return { events, panning }
}
