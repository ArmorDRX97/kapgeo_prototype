import { useCallback, useLayoutEffect, useRef, type HTMLAttributes } from 'react'

type Point = { x: number; y: number }

export function useMovablePopup(at: Point | null, contentKey?: string) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: number; x: number; y: number } | null>(null)
  const position = useRef({ left: 0, top: 0 })
  const x = at?.x, y = at?.y
  const move = useCallback((left: number, top: number) => {
    const popup = ref.current
    if (!popup) return
    const { width, height } = popup.getBoundingClientRect()
    position.current = {
      left: Math.max(12, Math.min(left, window.innerWidth - width - 12)),
      top: Math.max(12, Math.min(top, window.innerHeight - height - 12)),
    }
    popup.style.left = `${position.current.left}px`
    popup.style.top = `${position.current.top}px`
  }, [])
  useLayoutEffect(() => {
    if (x === undefined || y === undefined) return
    drag.current = null
    move(x + 12, y + 12)
  }, [x, y, move])
  useLayoutEffect(() => {
    const fit = () => move(position.current.left, position.current.top)
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [contentKey, move])
  const handle: HTMLAttributes<HTMLButtonElement> = {
    onPointerDown: event => {
      if (event.button !== 0 || event.isPrimary === false) return
      drag.current = { id: event.pointerId, x: event.clientX - position.current.left, y: event.clientY - position.current.top }
      event.currentTarget.setPointerCapture?.(event.pointerId)
    },
    onPointerMove: event => {
      const active = drag.current
      if (active && active.id === event.pointerId) move(event.clientX - active.x, event.clientY - active.y)
    },
    onLostPointerCapture: () => { drag.current = null },
    onKeyDown: event => {
      const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key]
      if (!direction) return
      event.preventDefault()
      const [dx = 0, dy = 0] = direction
      move(position.current.left + dx * 16, position.current.top + dy * 16)
    },
  }
  return { ref, handle }
}
