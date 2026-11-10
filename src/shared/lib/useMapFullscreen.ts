import { useCallback, useEffect, useRef, useState } from 'react'
import '../ui/map-fullscreen.css'

/** Expand within the browser viewport, preserving the map instance and camera. */
export function useMapFullscreen() {
  const [active, setActive] = useState(false)
  const returnFocus = useRef<HTMLElement | null>(null)
  const exit = useCallback(() => {
    setActive(false)
    returnFocus.current?.focus({ preventScroll: true })
  }, [])
  const toggle = useCallback(() => {
    if (active) { exit(); return }
    returnFocus.current = document.activeElement as HTMLElement | null
    setActive(true)
  }, [active, exit])
  useEffect(() => {
    if (!active) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('dialog[open], .map-object-popup, .filter-popover, .graphic-context-menu')) return
      event.preventDefault(); event.stopImmediatePropagation(); void exit()
    }
    document.addEventListener('keydown', escape, true)
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', escape, true) }
  }, [active, exit])
  return { active, toggle }
}
