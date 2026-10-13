import type { ContourArcEdit, XZ } from '../model/types'
import { sampleManualLine } from './curves'

export const samePoint = (a: XZ, b: XZ) => Math.hypot(a.x - b.x, a.z - b.z) < 1e-7
export function openRing(points: XZ[]): XZ[] { return points.length > 1 && samePoint(points[0]!, points.at(-1)!) ? points.slice(0, -1) : points }
/** Full, lossless geometry signature: changes invalidate a saved local operation. */
export function ringKey(points: XZ[]) { return openRing(points).map(p => `${p.x},${p.z}`).join(';') }
const arcLength = (points: XZ[]) => points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i]!.x, p.z - points[i]!.z), 0)
export function selectContourArc(points: XZ[], start: number, end: number, route: 'short' | 'long') {
  const ring = openRing(points)
  if (start === end || start < 0 || end < 0 || start >= ring.length || end >= ring.length) throw new Error('Выберите две разные вершины контура.')
  const walk = (direction: number) => { const indices = [start]; let i = start; while (i !== end) { i = (i + direction + ring.length) % ring.length; indices.push(i) } return indices }
  const forward = walk(1), backward = walk(-1), forwardShort = arcLength(forward.map(i => ring[i]!)) <= arcLength(backward.map(i => ring[i]!))
  const indices = (route === 'short') === forwardShort ? forward : backward
  return { indices, points: indices.map(i => ring[i]!), length: arcLength(indices.map(i => ring[i]!)), forward: indices === forward }
}
export function editContourArc(points: XZ[], edit: ContourArcEdit, fixed: XZ[]) {
  const ring = openRing(points), selected = selectContourArc(ring, edit.start, edit.end, edit.route)
  // Polygon union can remove collinear source vertices. Put those contacts back
  // on the selected path before editing so straightening cannot bypass them.
  const path = selected.points.slice(0, -1).flatMap((a, i) => {
    const b = selected.points[i + 1]!, dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz
    const contacts = fixed.flatMap(p => {
      const t = ((p.x - a.x) * dx + (p.z - a.z) * dz) / length2
      return t > 0 && t < 1 && Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz) < 1e-7 ? [{ p, t }] : []
    }).sort((p, q) => p.t - q.t).filter((p, index, all) => index === 0 || !samePoint(p.p, all[index - 1]!.p))
    return [a, ...contacts.map(p => p.p)]
  }).concat(selected.points.at(-1)!)
  const protectedIndices = path.flatMap((p, i) => i === 0 || i === path.length - 1 || fixed.some(q => samePoint(p, q)) ? [i] : [])
  const changed: XZ[] = protectedIndices.slice(1).flatMap((b, i) => {
    const a = protectedIndices[i]!, part = path.slice(a, b + 1)
    return (edit.operation === 'smooth' ? sampleManualLine(part, false) : [part[0]!, part.at(-1)!]).slice(0, -1)
  }).concat(path.at(-1)!)
  const other: XZ[] = [ring[edit.end]!]
  let cursor = edit.end
  while (cursor !== edit.start) { cursor = (cursor + (selected.forward ? 1 : -1) + ring.length) % ring.length; other.push(ring[cursor]!) }
  const result = [...changed.slice(0, -1), ...other.slice(0, -1)]
  return selected.forward ? result : result.reverse()
}
const cross = (a: XZ, b: XZ, c: XZ) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)
export function ringsIntersect(a: XZ[], b: XZ[], self = false) {
  const on = (p: XZ, q: XZ, r: XZ) => Math.abs(cross(p, q, r)) < 1e-8 && r.x >= Math.min(p.x, q.x) - 1e-8 && r.x <= Math.max(p.x, q.x) + 1e-8 && r.z >= Math.min(p.z, q.z) - 1e-8 && r.z <= Math.max(p.z, q.z) + 1e-8
  for (let i = 0; i < a.length; i++) for (let j = self ? i + 2 : 0; j < b.length; j++) {
    if (self && i === 0 && j === a.length - 1) continue
    const p = a[i]!, q = a[(i + 1) % a.length]!, r = b[j]!, s = b[(j + 1) % b.length]!
    if (cross(p, q, r) * cross(p, q, s) < 0 && cross(r, s, p) * cross(r, s, q) < 0 || on(p, q, r) || on(p, q, s) || on(r, s, p) || on(r, s, q)) return true
  }
  return false
}
export function insideRing(p: XZ, ring: XZ[]) { let inside = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const a = ring[i]!, b = ring[j]!; if ((a.z > p.z) !== (b.z > p.z) && p.x < (b.x - a.x) * (p.z - a.z) / (b.z - a.z) + a.x) inside = !inside } return inside }
export function polygonIssues(rings: XZ[][], bounds: { length: number; top: number; bottom: number }) {
  const opened = rings.map(openRing), issues: string[] = []
  for (const ring of opened) {
    if (ring.length < 3 || ring.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.z) || p.x < -1e-7 || p.x > bounds.length + 1e-7 || p.z > bounds.top + 1e-7 || p.z < bounds.bottom - 1e-7)) issues.push('Изменённая дуга выходит за рабочие границы.')
    if (ring.some((p, i) => samePoint(p, ring[(i + 1) % ring.length]!)) || ringsIntersect(ring, ring, true)) issues.push('Изменённый контур пересекает себя или содержит совпадающие точки.')
    if (Math.abs(ring.reduce((sum, p, i) => { const q = ring[(i + 1) % ring.length]!; return sum + p.x * q.z - q.x * p.z }, 0)) < 1e-7) issues.push('Контур имеет нулевую площадь.')
  }
  const outer = opened[0]!
  for (let i = 1; i < opened.length; i++) {
    const hole = opened[i]!
    if (hole.some(p => !insideRing(p, outer)) || ringsIntersect(hole, outer)) issues.push('Дуга пересекает внутреннее исключение контура.')
    for (let j = 1; j < i; j++) if (ringsIntersect(hole, opened[j]!) || hole.some(p => insideRing(p, opened[j]!)) || opened[j]!.some(p => insideRing(p, hole))) issues.push('Внутренние исключения пересекаются.')
  }
  return [...new Set(issues)]
}
