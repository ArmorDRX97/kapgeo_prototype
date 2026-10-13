import type { XZ } from '../model/types'
/** Shape-preserving cubic Hermite interpolation: passes every anchor without overshooting Z. */
export function sampleArc(points: XZ[], smooth: boolean): XZ[] {
  if (!smooth || points.length < 3) return points
  const slopes = points.slice(1).map((b, i) => (b.z - points[i]!.z) / (b.x - points[i]!.x))
  const derivatives = points.map((_, i) => {
    if (i === 0) return slopes[0]!
    if (i === points.length - 1) return slopes.at(-1)!
    const a = slopes[i - 1]!, b = slopes[i]!
    return a * b <= 0 ? 0 : 2 * a * b / (a + b)
  })
  return points.slice(1).flatMap((b, i) => {
    const a = points[i]!, width = b.x - a.x
    return Array.from({ length: 16 }, (_, n) => { const t = n / 16; return { x: a.x + width * t, z: (2 * t ** 3 - 3 * t ** 2 + 1) * a.z + (t ** 3 - 2 * t ** 2 + t) * width * derivatives[i]! + (-2 * t ** 3 + 3 * t ** 2) * b.z + (t ** 3 - t ** 2) * width * derivatives[i + 1]! } })
  }).concat(points.at(-1)!)
}
export function heightOnArc(points: XZ[], x: number) { const i = points.findIndex(p => p.x >= x); if (i <= 0) return points[Math.max(0, i)]!.z; const a = points[i - 1]!, b = points[i]!; return a.z + (b.z - a.z) * (x - a.x) / (b.x - a.x) }
/** Conservative interpolating spline for manual lines; caller validates the sampled geometry. */
export function sampleManualLine(points: XZ[], closed: boolean): XZ[] {
  if (points.length < 3) return points
  const count = closed ? points.length : points.length - 1
  return Array.from({ length: count }, (_, i) => {
    const a = points[i]!, b = points[(i + 1) % points.length]!, previous = points[i ? i - 1 : closed ? points.length - 1 : 0]!, next = points[(i + 2 < points.length ? i + 2 : closed ? (i + 2) % points.length : points.length - 1)]!
    const c = { x: a.x + (b.x - previous.x) / 6, z: a.z + (b.z - previous.z) / 6 }, d = { x: b.x - (next.x - a.x) / 6, z: b.z - (next.z - a.z) / 6 }
    return Array.from({ length: 12 }, (_, n) => { const t = n / 12, u = 1 - t; return { x: u ** 3 * a.x + 3 * u * u * t * c.x + 3 * u * t * t * d.x + t ** 3 * b.x, z: u ** 3 * a.z + 3 * u * u * t * c.z + 3 * u * t * t * d.z + t ** 3 * b.z } })
  }).flat().concat(closed ? [] : [points.at(-1)!])
}
