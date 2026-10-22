import type { GeologySection } from '../../../entities/geology-section/model/types'
import { mapSources, mapSegments } from '../../../entities/geology-section/lib/sectionMapGeometry'
import { projectToProfile } from '../../../entities/geology-section/lib/profile'
import { assignSegmentWell } from '../../../entities/geology-section/lib/segments'
import { segmentRadius } from '../../../entities/geology-section/lib/segmentRadius'
import { sectionSources } from '../../../entities/geology-section/lib/correlation'
import { sectionPlan, fromFieldPoint } from './sectionPlan'
import { changeSectionWells } from './wells'

export function sectionWellCatalogue(section: GeologySection) {
  const sources = new Map(mapSources(section).map(w => [w.id, w]))
  return sectionPlan(section).objects.filter(o => o.kind === 'well').sort((a, b) => Number(sources.has(b.id)) - Number(sources.has(a.id))).map(o => ({ id: o.id, name: o.name, depth: o.attributes.depth, collar: sources.get(o.id)?.collar ?? fromFieldPoint(o.parts[0]!.nodes[0]!), type: o.attributes.type }))
}
export function segmentWellDistance(section: GeologySection, segmentId: string, collar: { x: number; y: number }) {
  const segment = mapSegments(section).find(s => s.id === segmentId)
  return segment ? projectToProfile(collar, [segment.a, segment.b]).distance : Infinity
}
/** One user action adds to the local document and gives the well exactly one segment. */
export function assignWellToSegment(section: GeologySection, segmentId: string, wellId: string): GeologySection {
  const candidate = { ...section, wellIds: [...new Set([...section.wellIds, wellId])] }
  const well = sectionSources(candidate).find(w => w.id === wellId)
  if (!well || !mapSegments(section).some(s => s.id === segmentId)) return section
  if (segmentWellDistance(section, segmentId, well.collar) > segmentRadius(section, segmentId) + 1e-7) return section
  const added = !section.wellIds.includes(wellId)
  let next = added ? changeSectionWells(candidate, candidate.wellIds) : section
  if (added) next = {
    ...next,
    drawings: next.drawings.map(d => d.wellIds && section.wellIds.every(id => d.wellIds!.includes(id)) ? { ...d, wellIds: [...new Set([...d.wellIds, wellId])] } : d),
  }
  return assignSegmentWell(next, segmentId, wellId, true)
}
