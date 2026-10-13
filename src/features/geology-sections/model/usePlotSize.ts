import { useEffect, useState, type RefObject } from 'react'

/** SVG units match CSS pixels: fonts and interaction targets keep their size. */
export function usePlotSize(ref: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 1000, height: 500 })
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const measure = () => { const width = node.clientWidth, height = node.clientHeight; if (width > 84 && height > 84) setSize(previous => previous.width === width && previous.height === height ? previous : { width, height }) }
    measure()
    if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', measure); return () => window.removeEventListener('resize', measure) }
    const observer = new ResizeObserver(measure); observer.observe(node)
    return () => observer.disconnect()
  }, [ref])
  return size
}
