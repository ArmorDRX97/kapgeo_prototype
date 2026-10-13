import type { GeologySection, SectionGraphic, XZ } from '../model/types'
import { linkArc } from './correlation'
import { sampleManualLine } from './curves'
export function resolveGraphicPoints(graphic: SectionGraphic, section: GeologySection): XZ[] {
  if (!graphic.contourLinks?.length) return graphic.smooth ? sampleManualLine(graphic.points, graphic.closed) : graphic.points
  const linked = graphic.contourLinks.flatMap(id => section.links.technology.some(l => l.id === id) ? linkArc(section, 'technology', id, 'bottom') : [])
  const points = [...linked, ...graphic.points].sort((a, b) => a.x - b.x)
  return points.filter((a, i) => i === 0 || Math.hypot(a.x - points[i - 1]!.x, a.z - points[i - 1]!.z) > 1e-7)
}
