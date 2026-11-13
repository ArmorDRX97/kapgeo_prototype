import { sectionSources } from '../../../entities/geology-section/lib/correlation'
import { profileIssues, projectToProfile } from '../../../entities/geology-section/lib/profile'
import { sectionSegments } from '../../../entities/geology-section/lib/segments'
import type { GeologySection, XY } from '../../../entities/geology-section/model/types'
import type { sectionWellCatalogue } from './wellAssignment'

type CatalogueWell = ReturnType<typeof sectionWellCatalogue>[number]
export type SectionCandidate = CatalogueWell & { station: number; distance: number; segment: number }

export function wellsAlongSection(catalogue: CatalogueWell[], profile: XY[], radius: number): SectionCandidate[] {
  if (profileIssues(profile).length || !Number.isFinite(radius) || radius < 0) return []
  return catalogue.flatMap(well => {
    const { station, distance, segment } = projectToProfile(well.collar, profile)
    return distance <= radius + 1e-7 ? [{ ...well, station, distance, segment }] : []
  }).sort((a, b) => a.station - b.station || a.distance - b.distance || a.name.localeCompare(b.name, 'ru', { numeric: true }))
}

export function constructSection(template: GeologySection, profile: XY[], radius: number, wells: SectionCandidate[]): GeologySection {
  const draft = { ...template, profile, profileRadiusM: radius, wellIds: wells.map(well => well.id) }
  const ids = new Set(draft.wellIds)
  const sources = sectionSources(draft).filter(well => ids.has(well.id))
  const elevations = sources.flatMap(well => well.trajectory.map(point => point.z))
  const segments = sectionSegments(draft)
  const segmentWells = Object.fromEntries(segments.map(segment => [segment.id, [] as string[]]))
  for (const well of wells) segmentWells[segments[well.segment]!.id]!.push(well.id)
  return {
    ...draft,
    segmentWells,
    sourceRevisions: Object.fromEntries(sources.map(well => [well.id, well.revision])),
    top: elevations.length ? Math.ceil((Math.max(...elevations) + 5) / 10) * 10 : template.top,
    bottom: elevations.length ? Math.floor((Math.min(...elevations) - 5) / 10) * 10 : template.bottom,
  }
}
