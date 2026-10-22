import type { GeologySection } from '../../../entities/geology-section/model/types'
import { repairSection } from '../../../entities/geology-section/lib/repair'
import { sectionSources } from '../../../entities/geology-section/lib/correlation'

export function changeSectionWells(section: GeologySection, wellIds: string[]): GeologySection {
  return repairSection({ ...section, wellIds, sourceRevisions: Object.fromEntries(wellIds.map(id => [id, section.sourceRevisions[id] ?? sectionSources({ ...section, wellIds }).find(w => w.id === id)!.revision])),
    segmentWells: section.segmentWells ? Object.fromEntries(Object.entries(section.segmentWells).map(([id,wells])=>[id,wells.filter(w=>wellIds.includes(w))])) : undefined,
    drawings: section.drawings.map(d => ({ ...d, wellIds: d.wellIds?.filter(id => wellIds.includes(id)), columnSettings: d.columnSettings && Object.fromEntries(Object.entries(d.columnSettings).filter(([id]) => id === 'all' || wellIds.includes(id))), wellDecorations: d.wellDecorations && Object.fromEntries(Object.entries(d.wellDecorations).filter(([id]) => wellIds.includes(id))) })),
    columnSettings: section.columnSettings && Object.fromEntries(Object.entries(section.columnSettings).filter(([id]) => id === 'all' || wellIds.includes(id))),
    auxiliary: section.auxiliary?.filter(a => wellIds.includes(a.wellId)),
    contourEdits: Object.fromEntries(Object.entries(section.contourEdits ?? {}).map(([layer, edits]) => [layer, edits.filter(e => wellIds.includes(e.anchorId.split('/')[0]!))])),
    sourceOverrides: Object.fromEntries(Object.entries(section.sourceOverrides ?? {}).filter(([id]) => wellIds.includes(id))),
    participation: Object.fromEntries(Object.entries(section.participation).map(([layer, ids]) => [layer, ids.filter(id => wellIds.includes(id))])) as GeologySection['participation'],
    links: Object.fromEntries(Object.entries(section.links).map(([layer, links]) => [layer, links.filter(l => wellIds.includes(l.a.split('/')[0]!) && wellIds.includes(l.b.split('/')[0]!))])) as GeologySection['links'] }).section
}
