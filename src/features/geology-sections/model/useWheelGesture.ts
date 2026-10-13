import { useEffect, useRef, type RefObject } from 'react'

export function wheelZoom(zoom: number, event: Pick<WheelEvent, 'deltaY' | 'deltaMode'>, min: number, max: number) {
  const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1)
  return Math.max(min, Math.min(max, zoom * Math.exp(-Math.max(-240, Math.min(240, pixels)) * .0025)))
}

/** Native non-passive listener makes wheel zoom predictable without scrolling the page. */
export function useWheelGesture<T extends Element>(ref: RefObject<T | null>, onWheel: (event: WheelEvent) => void, includeScrollGestures = false) {
  const handler = useRef(onWheel)
  useEffect(() => { handler.current = onWheel })
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const listener = (event: Event) => { const wheel = event as WheelEvent; if (includeScrollGestures ? wheel.deltaX || wheel.deltaY : !wheel.shiftKey && Math.abs(wheel.deltaY) >= Math.abs(wheel.deltaX) && wheel.deltaY) handler.current(wheel) }
    node.addEventListener('wheel', listener, { passive: false })
    return () => node.removeEventListener('wheel', listener)
  }, [ref, includeScrollGestures])
}
