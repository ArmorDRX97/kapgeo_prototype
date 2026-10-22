import { depositField } from '../../../entities/geology-map/fieldScene'
import type { MapObject, MapProject } from '../../../entities/geology-map/model'
import { sectionSources } from '../../../entities/geology-section/lib/correlation'
import { sectionSegments } from '../../../entities/geology-section/lib/segments'
import type { GeologySection } from '../../../entities/geology-section/model/types'

import { toFieldPoint } from '../../../entities/geology-section/lib/fieldPlacement'
import { sectionFieldWells, sectionFieldWellById } from '../../../entities/geology-section/model/fieldWellSources'
export { toFieldPoint, fromFieldPoint } from '../../../entities/geology-section/lib/fieldPlacement'

export const planNumber = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
export function sectionPlan(section: GeologySection): MapProject {
  const sources = sectionSources(section), types = ['Откачная', 'Закачная', 'Наблюдательная', 'Закачная', 'Откачная', 'Разведочная', 'Закачная']
  const wells: MapObject[] = sources.map((w, i) => ({ id: w.id, kind: 'well', name: w.name, layerId: 'field-wells', shape: 'straight', closed: false, attributes: { type: sectionFieldWellById.get(w.id)?.attributes.type ?? types[i % types.length]!, depth: w.depth, value: 0, note: '' }, label: { visible: section.wellIds.includes(w.id), dx: 8, dy: -8 }, style: { stroke: '#23705b', fill: 'none', width: 1.2, paperWidth: .2, dash: 'solid', opacity: 1 }, parts: [{ id: `${w.id}-plan`, nodes: [w.collar, w.trajectory.at(-1)!].map((p, n) => ({ ...toFieldPoint(p), id: `${w.id}-point-${n}` })) }] }))
  const sourceIds = new Set(sources.map(w => w.id))
  const background = sectionFieldWells.slice(sources.filter(w => !sectionFieldWellById.has(w.id)).length).filter(o => !sourceIds.has(o.id)).map(o => ({ ...o, label: { ...o.label, visible: false } }))
  const profile: MapObject = { id: `${section.id}-profile`, name: section.title, kind: 'profile', layerId: 'field-profiles', shape: 'straight', closed: false, attributes: { type: '', depth: 0, value: 0, note: '' }, label: { visible: false, dx: 8, dy: -14 }, style: { stroke: '#2563bd', fill: 'none', width: 2.2, paperWidth: .3, dash: 'solid', opacity: 1 }, parts: [{ id: `${section.id}-trace`, nodes: section.profile.map((p, i) => ({ ...toFieldPoint(p), id: `${section.id}-v${i}` })) }], segmentWells: Object.fromEntries(sectionSegments(section).map(s => [`${section.id}-v${s.index}:${section.id}-v${s.index + 1}`, s.wellIds])) }
  return { ...depositField, id: `${section.id}-plan`, title: section.title, layers: depositField.layers.filter(l => l.id === 'field-wells' || l.id === 'field-profiles'), objects: [...background, ...wells, profile] }
}

export const profileVertexName = (index: number) => Array.from("АБВГДЕЖЗИКЛМН")[index] ?? String(index + 1)
