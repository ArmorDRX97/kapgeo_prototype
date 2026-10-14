import { point, type MapObject, type MapProject, type XY } from './model'

export type Camera = { x: number; y: number; scale: number }
export type Size = { width: number; height: number }
export const plotMargin = { left: 58, top: 28, right: 16, bottom: 38 }
export function worldToScreen(p: XY, camera: Camera, size: Size): XY { return { x: size.width / 2 + (p.y - camera.y) * camera.scale, y: size.height / 2 - (p.x - camera.x) * camera.scale } }
export function screenToWorld(p: XY, camera: Camera, size: Size): XY { return { x: camera.x - (p.y - size.height / 2) / camera.scale, y: camera.y + (p.x - size.width / 2) / camera.scale } }
export function fitCamera(project: MapProject, size: Size): Camera {
  const nodes = project.objects.flatMap(o => o.parts.flatMap(p => p.nodes))
  if (!nodes.length) return { x: 60650, y: 94950, scale: Math.min(size.width / 900, size.height / 600) }
  const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y), minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, scale: Math.max(.001, Math.min((size.width - 120) / Math.max(80, maxY - minY), (size.height - 100) / Math.max(80, maxX - minX))) }
}
export function zoomCamera(camera: Camera, factor: number, anchor: XY, size: Size): Camera {
  const p = screenToWorld(anchor, camera, size), scale = Math.max(.01, Math.min(80, camera.scale * factor))
  return { x: p.x + (anchor.y - size.height / 2) / scale, y: p.y - (anchor.x - size.width / 2) / scale, scale }
}
export function distance(a: XY, b: XY) { return Math.hypot(a.x - b.x, a.y - b.y) }
export function projectOnSegment(p: XY, a: XY, b: XY): XY {
  const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy, t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0
  return { x: a.x + t * dx, y: a.y + t * dy }
}
const lerp = (a: XY, b: XY, t: number): XY => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
function cubic(a: XY, b: XY, c: XY, d: XY, t: number): XY { return lerp(lerp(lerp(a, b, t), lerp(b, c, t), t), lerp(lerp(b, c, t), lerp(c, d, t), t), t) }
/** Cardinal interpolation: Catmull–Rom, tangent factor 0.5; fixed prototype profile. */
function segments(nodes: XY[], shape: MapObject['shape'], closed: boolean): XY[][] {
  if (shape === 'bezier') return Array.from({ length: Math.floor((nodes.length - 1) / 3) }, (_, i) => nodes.slice(i * 3, i * 3 + 4))
  return Array.from({ length: Math.max(0, nodes.length - (closed ? 0 : 1)) }, (_, i) => {
    const a = nodes[i]!, b = nodes[(i + 1) % nodes.length]!
    if (shape === 'straight') return [a, b]
    const before = nodes[(i - 1 + nodes.length) % nodes.length]!, after = nodes[(i + 2) % nodes.length]!, p = !closed && i === 0 ? a : before, q = !closed && i === nodes.length - 2 ? b : after
    return [a, { x: a.x + (b.x - p.x) / 6, y: a.y + (b.y - p.y) / 6 }, { x: b.x - (q.x - a.x) / 6, y: b.y - (q.y - a.y) / 6 }, b]
  })
}
export function objectPath(o: MapObject, transform: (p: XY) => XY = p => p): string {
  const pair = (p: XY) => { const s = transform(p); return `${s.x.toFixed(3)},${s.y.toFixed(3)}` }
  return o.parts.map(p => p.nodes.length ? `M${pair(p.nodes[0]!)} ${segments(p.nodes, o.shape, o.closed).map(s => s.length === 2 ? `L${pair(s[1]!)}` : `C${pair(s[1]!)} ${pair(s[2]!)} ${pair(s[3]!)}`).join(' ')}${o.closed ? ' Z' : ''}` : '').join(' ')
}
export function flattenedParts(o: MapObject): XY[][] { return o.parts.map(p => [p.nodes[0]!, ...segments(p.nodes, o.shape, o.closed).flatMap(s => s.length === 2 ? [s[1]!] : Array.from({ length: 24 }, (_, i) => cubic(s[0]!, s[1]!, s[2]!, s[3]!, (i + 1) / 24)))].filter(Boolean)) }
export function containsEvenOdd(parts: XY[][], point: XY) {
  let inside = false
  for (const ring of parts) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!, b = ring[j]!
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}
export function hitObject(o: MapObject, p: XY, radius: number) {
  const parts = flattenedParts(o)
  if (o.closed && o.style.fill !== 'none' && containsEvenOdd(parts, p)) return true
  return parts.some(nodes => nodes.some((n, i) => distance(p, n) <= radius || i > 0 && distance(p, projectOnSegment(p, nodes[i - 1]!, n)) <= radius || o.closed && i === 0 && distance(p, projectOnSegment(p, nodes.at(-1)!, n)) <= radius))
}
export function ticks(min: number, max: number, target: number) {
  const mag = 10 ** Math.floor(Math.log10(target)), step = ([1, 2, 5, 10].find(n => n * mag >= target) ?? 10) * mag
  return Array.from({ length: Math.min(100, Math.max(0, Math.floor(max / step) - Math.ceil(min / step) + 1)) }, (_, i) => (Math.ceil(min / step) + i) * step)
}
/** Insert an anchor by splitting the nearest cubic; the existing curve is preserved. */
export function splitBezier(o: MapObject, at: XY): MapObject {
  let best = { part: 0, start: 0, t: .5, d: Infinity }
  o.parts.forEach((part, pi) => { for (let i = 0; i + 3 < part.nodes.length; i += 3) for (let j = 1; j < 40; j++) { const t = j / 40, n = part.nodes, d = distance(at, cubic(n[i]!, n[i + 1]!, n[i + 2]!, n[i + 3]!, t)); if (d < best.d) best = { part: pi, start: i, t, d } } })
  if (!Number.isFinite(best.d)) return o
  return { ...o, parts: o.parts.map((part, pi) => { if (pi !== best.part) return part; const i = best.start, n = part.nodes, t = best.t, a = lerp(n[i]!, n[i + 1]!, t), b = lerp(n[i + 1]!, n[i + 2]!, t), c = lerp(n[i + 2]!, n[i + 3]!, t), d = lerp(a, b, t), e = lerp(b, c, t), q = lerp(d, e, t); return { ...part, nodes: [...n.slice(0, i + 1), ...[a, d, q, e, c].map(p => point(p.x, p.y)), ...n.slice(i + 3)] } }) }
}
