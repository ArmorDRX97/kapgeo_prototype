import type { Viewport } from '@xyflow/react'

/** A saved camera may no longer cover a graph after a content/layout update. */
export function viewportIntersectsBounds(view: Viewport, bounds: { x: number; y: number; width: number; height: number }, width: number, height: number) {
  const left = bounds.x * view.zoom + view.x, top = bounds.y * view.zoom + view.y
  return left < width && top < height && left + bounds.width * view.zoom > 0 && top + bounds.height * view.zoom > 0
}
