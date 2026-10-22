import type { XY } from './model'

/** Capsule around a finite segment: the same distance envelope as point-to-segment picking. */
export function corridorPath(a: XY, b: XY, radius: number): string {
  if (!Number.isFinite(radius) || radius <= 0) return ''
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  if (length < .000001) return `M${a.x - radius},${a.y}a${radius},${radius} 0 1 0 ${radius * 2},0a${radius},${radius} 0 1 0 ${-radius * 2},0Z`
  const nx = -(b.y - a.y) / length * radius, ny = (b.x - a.x) / length * radius
  return `M${a.x + nx},${a.y + ny}L${b.x + nx},${b.y + ny}A${radius},${radius} 0 0 0 ${b.x - nx},${b.y - ny}L${a.x - nx},${a.y - ny}A${radius},${radius} 0 0 0 ${a.x + nx},${a.y + ny}Z`
}
