import polygonClipping from 'polygon-clipping'
import type { GeologySection, SectionLayer, SectionAnchor, XZ, SectionWellSource } from '../model/types'
import { sectionWellSources } from '../model/fixtures'
import { referenceWellSources } from '../model/referenceSources'
import { pointAtDepth, profileLength } from './profile'
import { heightOnArc, sampleArc } from './curves'
import { editContourArc, ringKey, polygonIssues, ringsIntersect, insideRing, openRing } from './contourArc'
import { projectSectionPoint } from './segments'

export const sourceFor = (section: GeologySection, well: SectionWellSource): SectionWellSource => {
  const source = section.demoPreset?.startsWith('video-reference-') ? referenceWellSources.find(w => w.id === well.id) ?? well : well
  return { ...source, ...section.sourceOverrides?.[well.id] }
}
export const sectionSources = (section: GeologySection): SectionWellSource[] => section.demoPreset?.startsWith('video-reference-')
  ? referenceWellSources.map(well => ({ ...well, ...section.sourceOverrides?.[well.id] }))
  : sectionWellSources.map(well => sourceFor(section, well))
export function stationAtDepth(section: GeologySection, well: SectionWellSource, md: number): XZ {
  const p = pointAtDepth(sourceFor(section, well), md)
  return { x: projectSectionPoint(section, well.id, p).station, z: p.z }
}
export function virtualStationAtDepth(section: GeologySection, well: SectionWellSource, md: number): XZ {
  well = sourceFor(section, well)
  if (md <= well.depth) return stationAtDepth(section, well, md)
  const bottom = stationAtDepth(section, well, well.depth)
  return { x: bottom.x, z: bottom.z - (md - well.depth) }
}
/** Source interval contact, independent of display offsets and any manual bottom extension. */
export function sourceAnchorPoint(section: GeologySection, anchor: SectionAnchor, edge: 'top'|'bottom'): XZ {
  const well=sectionSources(section).find(w=>w.id===anchor.wellId)!
  return virtualStationAtDepth(section,well,edge==='top'?anchor.from:anchor.to)
}
export function mayExtendBottom(well: SectionWellSource, layer: SectionLayer, to: number) { const gap = well.depth - to; return gap >= 0 && gap <= (layer === 'technology' ? 3 : .5) }
export function layerAnchors(section: GeologySection, layer: SectionLayer): SectionAnchor[] {
  return sectionSources(section).filter(w => section.participation[layer].includes(w.id)).flatMap(w => {
    const source = sourceFor(section, w)
    let ordinary = source[layer]
    if (layer === 'technology') ordinary = ordinary.filter(i => i.kind === 'permeable')
    if (layer === 'offbalance') ordinary = ordinary.filter(i => i.kind === 'impermeable')
    if (layer === 'ore') ordinary = ordinary.flatMap(i => {
      const parts = source.technology.filter(t => t.kind === 'permeable' && Math.min(t.to, i.to) > Math.max(t.from, i.from)).map(t => ({ ...i, from: Math.max(i.from, t.from), to: Math.min(i.to, t.to), parent: t.id }))
      return parts.map(p => ({ ...p, id: parts.length === 1 ? i.id : `${i.id}@${p.parent}` }))
    })
    const inputs = [...ordinary, ...(section.auxiliary ?? []).filter(a => a.layer === layer && a.wellId === w.id).map(a => ({ ...a, kind: 'permeable' as const }))]
    return inputs.map(i => { const id = `${w.id}/${layer}/${i.id}`, bottom = virtualStationAtDepth(section, w, i.to); return { id, wellId: w.id, layer, top: virtualStationAtDepth(section, w, i.from), bottom: { ...bottom, z: section.bottomExtensions?.[id] ?? bottom.z }, from: i.from, to: i.to } })
  }).sort((a, b) => a.top.x - b.top.x || b.top.z - a.top.z)
}
export function adjacentAnchors(section: GeologySection, layer: SectionLayer, a: SectionAnchor, b: SectionAnchor) {
  const wells = [...new Set(layerAnchors(section, layer).map(p => p.wellId))]
  return Math.abs(a.top.x - b.top.x) > 0.001 && a.wellId !== b.wellId && Math.abs(wells.indexOf(a.wellId) - wells.indexOf(b.wellId)) === 1
}
export function correlationIssues(section: GeologySection, layer: SectionLayer): string[] {
  const anchors = layerAnchors(section, layer), links = section.links[layer], issues: string[] = []
  const pairs = new Set<string>()
  for (const anchor of anchors) {
    const extension = section.bottomExtensions?.[anchor.id]
    if (extension === undefined) continue
    const well = sectionSources(section).find(w => w.id === anchor.wellId)!, original = virtualStationAtDepth(section, well, anchor.to)
    if (!mayExtendBottom(well, layer, anchor.to) || !Number.isFinite(extension) || extension > original.z || extension < section.bottom) issues.push('Продолжение низа допустимо только вниз у забоя: 3 м для технологии, 0,5 м для руды.')
  }
  for (const link of links) {
    const a = anchors.find(p => p.id === link.a), b = anchors.find(p => p.id === link.b)
    if (!a || !b || !adjacentAnchors(section, layer, a, b)) { issues.push('Связь должна соединять интервалы соседних участвующих скважин.'); continue }
    const key = [a.id, b.id].sort().join('|')
    if (pairs.has(key)) issues.push('Повторяется связь интервалов.')
    pairs.add(key)
  }
  for (const edit of section.contourEdits?.[layer] ?? []) {
    const anchor = anchors.find(a => a.id === edit.anchorId)
    if (!anchor || !Number.isFinite(edit.x) || !Number.isFinite(edit.z)) { issues.push('Потеряна опора редактируемой точки.'); continue }
    const bounds = pinchBounds(section, layer, anchor, edit.side)
    if (edit.x < bounds.min || edit.x > bounds.max || edit.z < section.bottom || edit.z > section.top) issues.push('Точка выклинивания выходит за соседние скважины или рабочие высоты.')
    if (edit.boundary && Math.abs(edit.x - (edit.side === 'left' ? 0 : profileLength(section.profile))) > 1e-6) issues.push('Граничная точка должна оставаться на границе профиля.')
    if (edit.boundary) {
      const ends = boundaryInterval(section, layer, anchor, edit.side)
      if (!ends || !Number.isFinite(ends.top.z) || !Number.isFinite(ends.bottom.z) || ends.top.z <= ends.bottom.z || ends.top.z > section.top || ends.bottom.z < section.bottom) issues.push('Граничный интервал должен иметь положительную мощность и находиться внутри рабочих высот.')
    }
  }
  for (const edit of section.arcEdits?.[layer] ?? []) {
    const link = links.find(l => l.id === edit.linkId)
    if (!link) { issues.push('Дуга ссылается на удалённую связь.'); continue }
    const a = anchors.find(p => p.id === link.a), b = anchors.find(p => p.id === link.b)
    if (!a || !b) continue
    const min = Math.min(a[edit.edge].x, b[edit.edge].x), max = Math.max(a[edit.edge].x, b[edit.edge].x)
    if (edit.points.some((p, i) => !Number.isFinite(p.x) || !Number.isFinite(p.z) || p.x <= min || p.x >= max || p.z < section.bottom || p.z > section.top || i > 0 && p.x <= edit.points[i - 1]!.x)) issues.push('Вспомогательные точки дуги должны идти по X между опорами и внутри высот.')
  }
  if (!issues.length) for (const link of links) {
    const top = linkArc(section, layer, link.id, 'top'), bottom = linkArc(section, layer, link.id, 'bottom')
    const min = Math.max(top[0]!.x, bottom[0]!.x), max = Math.min(top.at(-1)!.x, bottom.at(-1)!.x)
    if (Array.from({ length: 65 }, (_, i) => min + (max - min) * i / 64).some(x => heightOnArc(top, x) <= heightOnArc(bottom, x))) issues.push('Верхняя и нижняя дуги пересекаются. Измените вспомогательные точки.')
  }
  return [...new Set(issues)]
}
export function linkArc(section: GeologySection, layer: SectionLayer, linkId: string, edge: 'top' | 'bottom'): XZ[] {
  const link = section.links[layer].find(l => l.id === linkId)!, anchors = layerAnchors(section, layer), a = anchors.find(p => p.id === link.a)!, b = anchors.find(p => p.id === link.b)!
  if (!a || !b) return []
  const ends = [a[edge], b[edge]].sort((p, q) => p.x - q.x), edit = section.arcEdits?.[layer]?.find(e => e.linkId === linkId && e.edge === edge)
  return sampleArc([ends[0]!, ...(edit?.points ?? []), ends[1]!], edit?.smooth ?? false)
}
export function pinchBounds(section: GeologySection, layer: SectionLayer, anchor: SectionAnchor, side: 'left' | 'right') {
  const stations = [...new Set(layerAnchors(section, layer).filter(a => a.wellId !== anchor.wellId).map(a => a.top.x))].sort((a, b) => a - b)
  return side === 'left' ? { min: stations.filter(x => x < anchor.top.x).at(-1) ?? 0, max: Math.min(anchor.top.x, anchor.bottom.x) - 0.001 } : { min: Math.max(anchor.top.x, anchor.bottom.x) + 0.001, max: stations.find(x => x > anchor.top.x) ?? profileLength(section.profile) }
}
export function pinchPoint(section: GeologySection, layer: SectionLayer, anchor: SectionAnchor, side: 'left' | 'right'): XZ {
  const edit = section.contourEdits?.[layer]?.find(e => e.anchorId === anchor.id && e.side === side)
  if (edit) return { x: edit.x, z: edit.z }
  const bounds = pinchBounds(section, layer, anchor, side), center = (anchor.top.x + anchor.bottom.x) / 2
  return { x: center + ((side === 'left' ? bounds.min : bounds.max) - center) / 4, z: (anchor.top.z + anchor.bottom.z) / 2 }
}
export type SectionPolygon = XZ[][]
export function linksAtAnchor(section: GeologySection, layer: SectionLayer, anchor: SectionAnchor, anchors = layerAnchors(section, layer)) {
  const others = section.links[layer].filter(link => link.a === anchor.id || link.b === anchor.id).map(link => anchors.find(other => other.id === (link.a === anchor.id ? link.b : link.a))).filter((other): other is SectionAnchor => !!other)
  return { left: others.some(other => other.top.x < anchor.top.x), right: others.some(other => other.top.x > anchor.top.x) }
}
export function boundaryInterval(section: GeologySection, layer: SectionLayer, anchor: SectionAnchor, side: 'left' | 'right') {
  const edit = section.contourEdits?.[layer]?.find(e => e.anchorId === anchor.id && e.side === side && e.boundary)
  if (!edit) return null
  const half = (anchor.top.z - anchor.bottom.z) / 2
  return { top: { x: edit.x, z: edit.boundaryTop ?? edit.z + half }, bottom: { x: edit.x, z: edit.boundaryBottom ?? edit.z - half } }
}
/** Polygon union preserves branches and interior holes, including 1:N connections. */
export function rawLayerPolygons(section: GeologySection, layer: SectionLayer): SectionPolygon[] {
  if (correlationIssues(section, layer).length) return []
  const anchors = layerAnchors(section, layer), patches: polygonClipping.Polygon[] = []
  for (const a of anchors) {
    const left = pinchPoint(section, layer, a, 'left'), right = pinchPoint(section, layer, a, 'right')
    const leftInterval = boundaryInterval(section, layer, a, 'left'), rightInterval = boundaryInterval(section, layer, a, 'right')
    const linked = section.demoPreset ? linksAtAnchor(section, layer, a, anchors) : { left: false, right: false }
    const ring = [a.top, ...(rightInterval ? [rightInterval.top, rightInterval.bottom] : linked.right ? [] : [right]), a.bottom, ...(leftInterval ? [leftInterval.bottom, leftInterval.top] : linked.left ? [] : [left]), a.top]
    if (ring.length > 3) patches.push([ring.map(p => [p.x, p.z] as polygonClipping.Pair)])
  }
  for (const link of section.links[layer]) {
    const top = linkArc(section, layer, link.id, 'top'), bottom = linkArc(section, layer, link.id, 'bottom')
    patches.push([[...top, ...[...bottom].reverse(), top[0]!].map(p => [p.x, p.z] as polygonClipping.Pair)])
  }
  if (!patches.length) return []
  return polygonClipping.union(patches[0]!, ...patches.slice(1)).map(p => p.map(r => r.map(([x, z]) => ({ x, z }))))
}
export function layerPolygons(section: GeologySection, layer: SectionLayer): SectionPolygon[] {
  const raw = rawLayerPolygons(section, layer), edits = section.contourArcEdits?.[layer] ?? []
  if (!edits.length) return raw
  const fixed = layerAnchors(section, layer).flatMap(a => [a.top, a.bottom])
  return raw.map(polygon => polygon.map(ring => { const edit = edits.find(e => e.ringKey === ringKey(ring)); if (!edit) return ring; try { return editContourArc(ring, edit, fixed) } catch { return ring } }))
}
export function contourArcIssues(section: GeologySection, layer: SectionLayer): string[] {
  const edits = section.contourArcEdits?.[layer] ?? []
  if (!edits.length) return []
  const rings = rawLayerPolygons(section, layer).flat(), issues: string[] = []
  if (new Set(edits.map(e => e.ringKey)).size !== edits.length) issues.push('На одном кольце допустима одна операция дуги. Замените или сбросьте предыдущую.')
  for (const edit of edits) {
    const ring = rings.find(r => ringKey(r) === edit.ringKey)
    if (!ring) { issues.push('Исходный контур изменился. Сбросьте устаревшую операцию дуги.'); continue }
    try { editContourArc(ring, edit, []); } catch (e) { issues.push(e instanceof Error ? e.message : 'Некорректная дуга.') }
  }
  if (issues.length) return [...new Set(issues)]
  const polygons = layerPolygons(section, layer)
  for (const polygon of polygons) issues.push(...polygonIssues(polygon, { length: profileLength(section.profile), top: section.top, bottom: section.bottom }))
  for (let i = 0; i < polygons.length; i++) for (let j = i + 1; j < polygons.length; j++) {
    const a = openRing(polygons[i]![0]!), b = openRing(polygons[j]![0]!)
    if (ringsIntersect(a, b) || a.some(p => insideRing(p, b)) || b.some(p => insideRing(p, a))) issues.push('Изменённая дуга пересекает соседний контур.')
  }
  return [...new Set(issues)]
}
export function polygonPath(rings: XZ[][], px: (x: number) => number, py: (z: number) => number) {
  return rings.map(r => r.map((p, i) => `${i ? 'L' : 'M'}${px(p.x)},${py(p.z)}`).join(' ') + 'Z').join(' ')
}
