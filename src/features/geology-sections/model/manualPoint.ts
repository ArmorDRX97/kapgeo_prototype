import type { GeologySection, SectionGraphic, XZ } from '../../../entities/geology-section/model/types'
import { graphicIssues, snappedPoint } from '../../../entities/geology-section/lib/geometry'

export function moveManualPoint(section: GeologySection, graphic: SectionGraphic, index: number, point: XZ, snap: boolean) {
  // A region must not snap back onto its own old outline while its vertex moves.
  const snapSource = { ...section, graphics: section.graphics.filter(g => g.id !== graphic.id && g.parentId !== graphic.id) }
  const result = snap ? snappedPoint(point, snapSource) : { point }
  const moved = { ...graphic, points: graphic.points.map((p, i) => i === index ? result.point : p) }
  const candidate = { ...section, graphics: section.graphics.some(g => g.id === moved.id) ? section.graphics.map(g => g.id === moved.id ? moved : g) : [...section.graphics, moved] }
  return { graphic: moved, label: result.label, issues: [...new Set(candidate.graphics.flatMap(g => graphicIssues(g, candidate)))] }
}
