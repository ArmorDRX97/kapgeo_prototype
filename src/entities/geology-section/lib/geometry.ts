import type { GeologySection, SectionGraphic, XZ } from '../model/types'
import { profileLength } from './profile'
import { resolveGraphicPoints } from './boundaries'
import { sectionWellSources } from '../model/fixtures'
import { stationAtDepth } from './correlation'

const cross = (a: XZ, b: XZ, c: XZ) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)
function intersects(a: XZ, b: XZ, c: XZ, d: XZ) {
  const on = (p: XZ, q: XZ, r: XZ) => Math.abs(cross(p, q, r)) < 1e-8 && r.x >= Math.min(p.x, q.x) - 1e-8 && r.x <= Math.max(p.x, q.x) + 1e-8 && r.z >= Math.min(p.z, q.z) - 1e-8 && r.z <= Math.max(p.z, q.z) + 1e-8
  return cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0 || on(a, b, c) || on(a, b, d) || on(c, d, a) || on(c, d, b)
}
export function pointInside(p: XZ, ring: XZ[]) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const a = ring[i]!, b = ring[j]!; if ((a.z > p.z) !== (b.z > p.z) && p.x < (b.x - a.x) * (p.z - a.z) / (b.z - a.z) + a.x) inside = !inside }
  return inside
}
export function graphicIssues(graphic: SectionGraphic, section: GeologySection): string[] {
  const p = resolveGraphicPoints(graphic, section), issues: string[] = [], length = profileLength(section.profile)
  if (!graphic.name.trim()) issues.push('Укажите название графического объекта.')
  if (graphic.type === 'lithology' && !graphic.closed) issues.push('Литологическая область должна быть замкнута.')
  if (graphic.type === 'lithology' && !graphic.parentId && !graphic.rock) issues.push('Назначьте породу литологической области.')
  if (p.length < (graphic.closed ? 3 : 2)) issues.push(graphic.closed ? 'Замкнутой области нужны минимум три точки.' : 'Линии нужны минимум две точки.')
  if (p.some(a => !Number.isFinite(a.x) || !Number.isFinite(a.z) || a.x < 0 || a.x > length || a.z > section.top || a.z < section.bottom)) issues.push('Точки должны находиться внутри профиля и рабочих высот.')
  const segments = p.slice(1).map((b, i) => [p[i]!, b] as const)
  if (graphic.closed && p.length) segments.push([p.at(-1)!, p[0]!])
  if (segments.some(([a, b]) => Math.hypot(a.x - b.x, a.z - b.z) < 0.001)) issues.push('Повторяющиеся соседние точки недопустимы.')
  for (let i = 0; i < segments.length; i++) for (let j = i + 2; j < segments.length; j++) {
    if (graphic.closed && i === 0 && j === segments.length - 1) continue
    if (intersects(...segments[i]!, ...segments[j]!)) issues.push('Самопересечение линии недопустимо.')
  }
  if (graphic.closed && Math.abs(p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]!; return s + a.x * b.z - b.x * a.z }, 0)) < 0.001) issues.push('Область должна иметь ненулевую площадь.')
  if (graphic.parentId) {
    const parent = section.graphics.find(g => g.id === graphic.parentId)
    if (!graphic.closed || !parent || !parent.closed || parent.parentId || parent.type !== 'lithology' || graphic.type !== 'lithology') issues.push('Исключение должно принадлежать замкнутой литологической области.')
    else {
      const parentPoints = resolveGraphicPoints(parent, section)
      if (p.some(a => !pointInside(a, parentPoints))) issues.push('Все точки исключения должны лежать строго внутри родительской области.')
      const parentSegments = parentPoints.map((a, i) => [a, parentPoints[(i + 1) % parentPoints.length]!] as const)
      if (segments.some(([a, b]) => parentSegments.some(([c, d]) => intersects(a, b, c, d)))) issues.push('Исключение пересекает границу родительской области.')
      for (const sibling of section.graphics.filter(g => g.id !== graphic.id && g.parentId === parent.id)) {
        const siblingPoints = resolveGraphicPoints(sibling, section)
        if (p.some(a => pointInside(a, siblingPoints)) || siblingPoints.some(a => pointInside(a, p)) || segments.some(([a, b]) => siblingPoints.some((c, i) => intersects(a, b, c, siblingPoints[(i + 1) % siblingPoints.length]!)))) issues.push('Внутренние исключения не должны пересекаться.')
      }
    }
  }
  if (graphic.contourLinks?.some(id => !section.links.technology.some(l => l.id === id))) issues.push('Граница ссылается на удалённую дугу технологического контура.')
  if (graphic.contourLinks?.length && p.slice(1).some((a, i) => a.x <= p[i]!.x)) issues.push('Выбранные дуги неоднозначны по высоте: выберите одну ветвь контура.')
  return [...new Set(issues)]
}
export function snappedPoint(point: XZ, section: GeologySection, tolerance = 3): { point: XZ; label?: string } {
  let best = tolerance, result = point, label: string | undefined
  const length = profileLength(section.profile)
  for (const well of sectionWellSources.filter(w => section.wellIds.includes(w.id))) {
    const depths = new Set(well.lithology.flatMap(interval => [interval.from, interval.to]))
    for (const md of depths) {
      const contact = stationAtDepth(section, well, md), distance = Math.hypot(contact.x - point.x, contact.z - point.z)
      if (contact.z <= section.top && contact.z >= section.bottom && contact.x >= 0 && contact.x <= length && distance < best) {
        best = distance; result = contact; label = `${well.name}, литоконтакт MD ${md.toFixed(1)} м`
      }
    }
  }
  for (const g of section.graphics.filter(g => g.type === 'lithology')) {
    const points = resolveGraphicPoints(g, section), segments = points.slice(1).map((b, i) => [points[i]!, b] as const)
    if (g.closed && points.length) segments.push([points.at(-1)!, points[0]!])
    for (const [a, b] of segments) {
      const dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz
      const t = length ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / length)) : 0
      const p = { x: a.x + t * dx, z: a.z + t * dz }, distance = Math.hypot(point.x - p.x, point.z - p.z)
      if (distance < best) { best = distance; result = p; label = g.name }
    }
  }
  return { point: result, label }
}
