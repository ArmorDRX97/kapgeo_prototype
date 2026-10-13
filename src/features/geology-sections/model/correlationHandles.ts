import type { GeologySection, SectionLayer, XZ } from '../../../entities/geology-section/model/types'
import { boundaryInterval, layerAnchors, pinchBounds, pinchPoint } from '../../../entities/geology-section/lib/correlation'

export type CorrelationHandle = { id: string; label: string; point: XZ; target:
  { type: 'pinch'; anchorId: string; side: 'left' | 'right' } |
  { type: 'boundary'; anchorId: string; side: 'left' | 'right'; edge: 'top' | 'bottom' } |
  { type: 'arc'; linkId: string; edge: 'top' | 'bottom'; index: number } }

export function correlationHandles(section: GeologySection, layer: SectionLayer, selection?: string): CorrelationHandle[] {
  const anchor = layerAnchors(section, layer).find(a => a.id === selection)
  if (!anchor) return []
  const handles: CorrelationHandle[] = []
  for (const side of ['left', 'right'] as const) {
    const boundary = boundaryInterval(section, layer, anchor, side), label = side === 'left' ? 'Слева' : 'Справа'
    if (boundary) for (const edge of ['top', 'bottom'] as const) handles.push({ id: `boundary-${side}-${edge}`, label: `${label}: ${edge === 'top' ? 'верх' : 'низ'} граничного интервала`, point: boundary[edge], target: { type: 'boundary', anchorId: anchor.id, side, edge } })
    else handles.push({ id: `pinch-${side}`, label: `${label}: точка выклинивания`, point: pinchPoint(section, layer, anchor, side), target: { type: 'pinch', anchorId: anchor.id, side } })
  }
  for (const edit of section.arcEdits?.[layer] ?? []) {
    const link = section.links[layer].find(l => l.id === edit.linkId)
    if (!link || link.a !== anchor.id && link.b !== anchor.id) continue
    edit.points.forEach((point, index) => handles.push({ id: `arc-${edit.linkId}-${edit.edge}-${index}`, label: `${edit.edge === 'top' ? 'Верхняя' : 'Нижняя'} дуга: вспомогательная точка ${index + 1}`, point, target: { type: 'arc', linkId: edit.linkId, edge: edit.edge, index } }))
  }
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
  const bounds = pinchBounds(section, layer, anchor, target.side), edits = section.contourEdits?.[layer] ?? [], existing = edits.find(e => e.anchorId === anchor.id && e.side === target.side)
  const boundary = boundaryInterval(section, layer, anchor, target.side)
  const moved = target.type === 'boundary' && existing && boundary ? { ...existing, boundaryTop: target.edge === 'top' ? z : boundary.top.z, boundaryBottom: target.edge === 'bottom' ? z : boundary.bottom.z } :
    { anchorId: anchor.id, side: target.side, x: clamp(point.x, bounds.min, bounds.max), z, boundary: false }
  return { ...section, contourEdits: { ...section.contourEdits, [layer]: [...edits.filter(e => !(e.anchorId === anchor.id && e.side === target.side)), moved] } }
}
