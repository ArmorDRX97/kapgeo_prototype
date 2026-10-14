import type { GeologySection, SectionLayer, XZ } from '../../../entities/geology-section/model/types'
import { boundaryInterval, layerAnchors, linksAtAnchor, mayExtendBottom, pinchBounds, pinchPoint, sectionSources } from '../../../entities/geology-section/lib/correlation'

export type CorrelationHandle = { id: string; label: string; point: XZ; kind?: 'pinch'|'boundary'|'auxiliary'|'extension'; target:
  { type: 'extension'; anchorId: string } |
  { type: 'pinch'; anchorId: string; side: 'left' | 'right' } |
  { type: 'boundary'; anchorId: string; side: 'left' | 'right'; edge: 'top' | 'bottom' } |
  { type: 'arc'; linkId: string; edge: 'top' | 'bottom'; index: number } }

export function correlationHandles(section: GeologySection, layer: SectionLayer, selection?: string): CorrelationHandle[] {
  const anchors = layerAnchors(section, layer), anchor = anchors.find(a => a.id === selection)
  if (!anchor) return []
  const handles: CorrelationHandle[] = []
  const linked = linksAtAnchor(section, layer, anchor, anchors)
  for (const side of ['left', 'right'] as const) {
    const boundary = boundaryInterval(section, layer, anchor, side), label = side === 'left' ? 'Слева' : 'Справа'
    if (boundary) for (const edge of ['top', 'bottom'] as const) handles.push({ id: `boundary-${side}-${edge}`, kind:'boundary', label: `${label}: ${edge === 'top' ? 'верх' : 'низ'} граничного интервала`, point: boundary[edge], target: { type: 'boundary', anchorId: anchor.id, side, edge } })
    else if (!section.demoPreset || !linked[side]) handles.push({ id: `pinch-${side}`, kind:'pinch', label: `${label}: точка выклинивания`, point: pinchPoint(section, layer, anchor, side), target: { type: 'pinch', anchorId: anchor.id, side } })
  }
  for (const edit of section.arcEdits?.[layer] ?? []) {
    const link = section.links[layer].find(l => l.id === edit.linkId)
    if (!link || link.a !== anchor.id && link.b !== anchor.id) continue
    edit.points.forEach((point, index) => handles.push({ id: `arc-${edit.linkId}-${edit.edge}-${index}`, kind:'auxiliary', label: `${edit.edge === 'top' ? 'Верхняя' : 'Нижняя'} дуга: вспомогательная точка ${index + 1}`, point, target: { type: 'arc', linkId: edit.linkId, edge: edit.edge, index } }))
  }
  if(section.bottomExtensions?.[anchor.id]!==undefined) handles.push({id:`extension-${anchor.id}`,kind:'extension',label:'Продолжение нижней границы: только высота Z',point:anchor.bottom,target:{type:'extension',anchorId:anchor.id}})
  return handles
}

/** Pointer and keyboard edits share the numeric editor's constraints and commit validation. */
export function moveCorrelationHandle(section: GeologySection, layer: SectionLayer, handle: CorrelationHandle, point: XZ): GeologySection {
  const target = handle.target, anchors = layerAnchors(section, layer)
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))
  const z = clamp(point.z, section.bottom, section.top)
  if (target.type === 'arc') {
    const edit = section.arcEdits?.[layer]?.find(e => e.linkId === target.linkId && e.edge === target.edge), link = section.links[layer].find(l => l.id === target.linkId)
    if (!edit || !link) return section
    const a = anchors.find(p => p.id === link.a)!, b = anchors.find(p => p.id === link.b)!
    const min = edit.points[target.index - 1]?.x ?? Math.min(a[target.edge].x, b[target.edge].x), max = edit.points[target.index + 1]?.x ?? Math.max(a[target.edge].x, b[target.edge].x)
    const moved = { ...edit, points: edit.points.map((p, i) => i === target.index ? { x: clamp(point.x, min + .001, max - .001), z } : p) }
    return { ...section, arcEdits: { ...section.arcEdits, [layer]: section.arcEdits![layer]!.map(e => e === edit ? moved : e) } }
  }
  const anchor = anchors.find(a => a.id === target.anchorId)
  if (!anchor) return section
  if(target.type==='extension') {const well=sectionSources(section).find(w=>w.id===anchor.wellId)!;return mayExtendBottom(well,layer,anchor.to)?{...section,bottomExtensions:{...section.bottomExtensions,[anchor.id]:z}}:section}
  const bounds = pinchBounds(section, layer, anchor, target.side), edits = section.contourEdits?.[layer] ?? [], existing = edits.find(e => e.anchorId === anchor.id && e.side === target.side)
  const boundary = boundaryInterval(section, layer, anchor, target.side)
  if (target.type === 'pinch' && section.demoPreset && !boundary && linksAtAnchor(section, layer, anchor, anchors)[target.side]) return section
  const moved = target.type === 'boundary' && existing && boundary ? { ...existing, boundaryTop: target.edge === 'top' ? z : boundary.top.z, boundaryBottom: target.edge === 'bottom' ? z : boundary.bottom.z } :
    { anchorId: anchor.id, side: target.side, x: clamp(point.x, bounds.min, bounds.max), z, boundary: false }
  return { ...section, contourEdits: { ...section.contourEdits, [layer]: [...edits.filter(e => !(e.anchorId === anchor.id && e.side === target.side)), moved] } }
}
