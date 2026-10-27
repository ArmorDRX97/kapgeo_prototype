import type { GeologySection } from '../../../entities/geology-section/model/types'
import { sectionSources } from '../../../entities/geology-section/lib/correlation'
import { projectToProfile } from '../../../entities/geology-section/lib/profile'
import { midCell, mifHeader } from '../../geology-data/model'
export function sectionMapInfo(section: GeologySection) {
  const geometry: string[] = [], attributes: string[] = []
  for (const well of sectionSources(section).filter(w => section.wellIds.includes(w.id))) {
    const points = well.trajectory.map(p => `${projectToProfile(p, section.profile).station.toFixed(4)} ${p.z.toFixed(4)}`)
    if (points.length < 2) continue
    geometry.push(`Pline ${points.length}\n${points.join('\n')}\nPen (1,2,2437250)`); attributes.push(midCell(well.name, 'well'))
  }
  for (const g of section.graphics.filter(g => g.points.length >= 2)) {
    geometry.push(`Pline ${g.points.length + (g.closed ? 1 : 0)}\n${[...g.points, ...(g.closed ? [g.points[0]!] : [])].map(p => `${p.x.toFixed(4)} ${p.z.toFixed(4)}`).join('\n')}`); attributes.push(midCell(g.name, g.type))
  }
  return { mif: mifHeader + geometry.join('\n') + '\n', mid: attributes.join('\n') + '\n', count: geometry.length }
}
