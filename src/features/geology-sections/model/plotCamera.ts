import type { XZ } from '../../../entities/geology-section/model/types'

export type PlotBounds = { left: number; right: number; top: number; bottom: number }
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))
export function plotCamera(base: PlotBounds, zoom: number, ratio: number, center?: XZ | null) {
  const width = (base.right - base.left) / zoom, height = (base.top - base.bottom) / (zoom * ratio)
  const halfX = Math.min(width, base.right - base.left) / 2, halfZ = Math.min(height, base.top - base.bottom) / 2
  const x = clamp(center?.x ?? (base.left + base.right) / 2, base.left + halfX, base.right - halfX)
  const z = clamp(center?.z ?? (base.top + base.bottom) / 2, base.bottom + halfZ, base.top - halfZ)
  return { left: x - width / 2, right: x + width / 2, top: z + height / 2, bottom: z - height / 2 }
}
export function anchoredCenter(bounds: PlotBounds, nextWidth: number, nextHeight: number, fx: number, fy: number): XZ {
  return { x: bounds.left + fx * (bounds.right - bounds.left) + (.5 - fx) * nextWidth, z: bounds.top - fy * (bounds.top - bounds.bottom) + (fy - .5) * nextHeight }
}
