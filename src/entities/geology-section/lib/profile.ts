import type { XY, SectionWellSource } from '../model/types'

export const distance = (a: XY, b: XY) => Math.hypot(b.x - a.x, b.y - a.y)
export function profileIssues(points: XY[]): string[] {
  if (points.length < 2) return ['Профиль должен содержать не менее двух точек.']
  if (points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return ['Координаты профиля должны быть конечными числами.']
  return points.slice(1).some((p, i) => distance(p, points[i]!) < 0.001) ? ['Нулевой сегмент профиля недопустим.'] : []
}
export function profileLength(points: XY[]) { return points.slice(1).reduce((sum, p, i) => sum + distance(p, points[i]!), 0) }

/** Closest point on the directed polyline, with station measured from its first point. */
export function projectToProfile(point: XY, profile: XY[]) {
  if (profileIssues(profile).length) throw new Error(profileIssues(profile).join(' '))
  let prefix = 0
  let best = { station: 0, distance: Infinity, segment: 0, x: profile[0]!.x, y: profile[0]!.y }
  profile.slice(1).forEach((b, index) => {
    const a = profile[index]!, length = distance(a, b)
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / length ** 2))
    const projected = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }
    const offset = distance(point, projected)
    if (offset < best.distance) best = { station: prefix + t * length, distance: offset, segment: index, ...projected }
    prefix += length
  })
  return best
}

export function pointAtDepth(well: SectionWellSource, md: number) {
  if (!Number.isFinite(md) || md < 0 || md > well.depth) throw new Error('Глубина выходит за ствол скважины.')
  const index = well.trajectory.findIndex(p => p.md >= md)
  const b = well.trajectory[index], a = well.trajectory[Math.max(0, index - 1)]
  if (!a || !b) throw new Error('Траектория не покрывает глубину.')
  const t = b.md === a.md ? 0 : (md - a.md) / (b.md - a.md)
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y), z: a.z + t * (b.z - a.z) }
}

/** Orthogonal least squares, including vertical lines; oriented from first selected bottom to last. */
export function fitProfile(points: XY[], before = 20, after = 20): XY[] {
  if (points.length < 2 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y)) || !Number.isFinite(before) || !Number.isFinite(after) || before < 0 || after < 0) throw new Error('Нужны хотя бы два разных забоя и неотрицательные поля.')
  const center = { x: points.reduce((s, p) => s + p.x, 0) / points.length, y: points.reduce((s, p) => s + p.y, 0) / points.length }
  let xx = 0, xy = 0, yy = 0
  for (const p of points) { xx += (p.x - center.x) ** 2; xy += (p.x - center.x) * (p.y - center.y); yy += (p.y - center.y) ** 2 }
  if (xx + yy < 1e-6) throw new Error('Забои совпадают: направление профиля не определено.')
  if (Math.hypot(xx - yy, 2 * xy) < 1e-6) throw new Error('Направление неоднозначно: задайте профиль вручную.')
  const angle = Math.atan2(2 * xy, xx - yy) / 2
  let dx = Math.cos(angle), dy = Math.sin(angle)
  const first = points[0]!, last = points.at(-1)!
  const orientation = (last.x - first.x) * dx + (last.y - first.y) * dy
  if (Math.abs(orientation) < 1e-8) throw new Error('Первый и последний забои не задают направление. Измените их порядок.')
  if (orientation < 0) { dx *= -1; dy *= -1 }
  const projections = points.map(p => (p.x - center.x) * dx + (p.y - center.y) * dy)
  const start = Math.min(...projections) - before, end = Math.max(...projections) + after
  return [{ x: center.x + dx * start, y: center.y + dy * start }, { x: center.x + dx * end, y: center.y + dy * end }]
}

export function fitBrokenProfile(groups: XY[][], before = 20, after = 20): XY[] {
  if (!groups.length) throw new Error('Выберите скважины сегментов.')
  const lines = groups.map((p, i) => fitProfile(p, i === 0 ? before : 0, i === groups.length - 1 ? after : 0))
  const result: XY[] = [lines[0]![0]!]
  for (let i = 1; i < lines.length; i++) {
    const [a, b] = lines[i - 1] as [XY, XY], [c, d] = lines[i] as [XY, XY]
    const ux = b.x - a.x, uy = b.y - a.y, vx = d.x - c.x, vy = d.y - c.y
    const cross = ux * vy - uy * vx
    if (Math.abs(cross) < 1e-8) throw new Error('Соседние прямые параллельны: задайте общую вершину вручную.')
    const t = ((c.x - a.x) * vy - (c.y - a.y) * vx) / cross
    result.push({ x: a.x + t * ux, y: a.y + t * uy })
  }
  result.push(lines.at(-1)![1]!)
  if (profileIssues(result).length) throw new Error(profileIssues(result).join(' '))
  for (let i = 0; i < lines.length; i++) {
    const a = result[i]!, b = result[i + 1]!, line = lines[i]!
    if ((b.x - a.x) * (line[1]!.x - line[0]!.x) + (b.y - a.y) * (line[1]!.y - line[0]!.y) <= 0) throw new Error('Направления рассчитанных сегментов не согласованы.')
    for (const p of groups[i]!) if (projectToProfile(p, result).distance + 1e-7 < projectToProfile(p, [a, b]).distance) throw new Error('Забой ближе к другому сегменту: измените распределение скважин.')
  }
  return result
}
