import type { GeologySection, XY } from '../model/types'
import { sectionSegments } from './segments'
import { sectionSources } from './correlation'
import { projectToProfile } from './profile'

/** Map placement is independent of cumulative distance on the unfolded section. */
export function mapSegments(section: GeologySection) {
  return sectionSegments(section).map(segment => {
    const line = section.mapGeometry?.segments[segment.id]
    return { ...segment, a: line?.[0] ?? segment.a, b: line?.[1] ?? segment.b }
  })
}
export function mapSources(section: GeologySection) {
  return sectionSources(section).map(well => {
    const collar = section.mapGeometry?.wells[well.id]
    if (!collar) return well
    const dx = collar.x - well.collar.x, dy = collar.y - well.collar.y
    return { ...well, collar: { ...well.collar, ...collar }, trajectory: well.trajectory.map(p => ({ ...p, x: p.x + dx, y: p.y + dy })) }
  })
}
export function mapDistance(section: GeologySection, point: XY) {
  return Math.min(...mapSegments(section).map(s => projectToProfile(point, [s.a, s.b]).distance))
}
export function placeMapSegment(section: GeologySection, id: string, line: [XY, XY]): GeologySection {
  return { ...section, mapGeometry: { wells: section.mapGeometry?.wells ?? {}, segments: { ...section.mapGeometry?.segments, [id]: line } } }
}
