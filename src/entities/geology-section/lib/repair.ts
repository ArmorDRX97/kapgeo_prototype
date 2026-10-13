import type { GeologySection } from '../model/types'
import { adjacentAnchors, layerAnchors, pinchBounds, mayExtendBottom, virtualStationAtDepth } from './correlation'
import { sectionWellSources } from '../model/fixtures'
import { correlationIssues, rawLayerPolygons } from './correlation'
import { ringKey } from './contourArc'
export function repairSection(section: GeologySection) {
  const next = structuredClone(section), changes: string[] = []
  for (const layer of ['technology', 'ore', 'uncorrected', 'offbalance'] as const) {
    const anchors = layerAnchors(next, layer), links = next.links[layer]
    next.links[layer] = links.filter(l => { const a = anchors.find(p => p.id === l.a), b = anchors.find(p => p.id === l.b); return !!a && !!b && adjacentAnchors(next, layer, a, b) })
    if (links.length !== next.links[layer].length) changes.push(`${layer}: удалятся ${links.length - next.links[layer].length} недействительных связей`)
    const edits = next.contourEdits?.[layer] ?? []
    const valid = edits.filter(e => { const a = anchors.find(p => p.id === e.anchorId); if (!a) return false; const bounds = pinchBounds(next, layer, a, e.side); return e.x >= bounds.min && e.x <= bounds.max && e.z >= next.bottom && e.z <= next.top })
    if (edits.length !== valid.length) changes.push(`${layer}: восстановятся ${edits.length - valid.length} исходных выклиниваний`)
    next.contourEdits = { ...next.contourEdits, [layer]: valid }
    const arcs = next.arcEdits?.[layer] ?? []
    next.arcEdits = { ...next.arcEdits, [layer]: arcs.filter(e => next.links[layer].some(l => l.id === e.linkId)) }
    if (correlationIssues(next, layer).length && next.arcEdits[layer]?.length) { next.arcEdits[layer] = []; changes.push(`${layer}: вспомогательные дуги будут спрямлены после изменения опор`) }
    const contourArcs = next.contourArcEdits?.[layer] ?? []
    if (contourArcs.length) {
      const keys = new Set(rawLayerPolygons(next, layer).flat().map(ringKey)), validArcs = contourArcs.filter(e => keys.has(e.ringKey))
      next.contourArcEdits = { ...next.contourArcEdits, [layer]: validArcs }
      if (contourArcs.length !== validArcs.length) changes.push(`${layer}: после изменения контура сброшены операции дуг (${contourArcs.length - validArcs.length}); остальные правки сохранены`)
    }
  }
  const anchors = (['technology', 'ore', 'uncorrected', 'offbalance'] as const).flatMap(layer => layerAnchors(next, layer))
  next.bottomExtensions = Object.fromEntries(Object.entries(next.bottomExtensions ?? {}).filter(([id, z]) => {
    const a = anchors.find(p => p.id === id), well = a && sectionWellSources.find(w => w.id === a.wellId)
    return !!a && !!well && mayExtendBottom(well, a.layer, a.to) && z <= virtualStationAtDepth(next, well, a.to).z && z >= next.bottom
  }))
  for (const [id, source] of Object.entries(next.sourceOverrides ?? {})) next.sourceRevisions[id] = source.revision
  next.graphics = next.graphics.map(g => {
    if (!g.contourLinks?.some(id => !next.links.technology.some(l => l.id === id))) return g
    changes.push(`${g.name}: потерянные дуги отсоединятся, сохранится последняя геометрия границы`)
    return { ...g, points: g.contourSnapshot ?? g.points, contourLinks: [], detachedFromContour: true }
  })
  return { section: next, changes }
}
