import { layerVisible, type MapAnchor, type MapObject, type MapPoint, type MapProject, type SnapPoint, type XY } from './model'

export function anchorPoint(project: MapProject, anchor: MapAnchor): MapPoint | undefined {
  return project.objects.find(o => o.kind === 'well' && o.id === anchor.wellId)?.parts[0]?.nodes[anchor.target === 'collar' ? 0 : 1]
}
export function bindNode(project: MapProject, object: MapObject, nodeId: string, anchor?: MapAnchor): MapObject {
  const target = anchor ? anchorPoint(project, anchor) : undefined
  return { ...object, parts: object.parts.map(part => ({ ...part, nodes: part.nodes.map(node => node.id !== nodeId ? node : { ...node, ...(target ? { x: target.x, y: target.y } : {}), anchor: target ? anchor : undefined }) })) }
}
export function snapToWell(project: MapProject, p: XY, radius: number, target: MapAnchor['target']): SnapPoint {
  let best: SnapPoint = { x: p.x, y: p.y }, bestDistance = radius
  for (const well of project.objects) if (well.kind === 'well' && layerVisible(project, well.layerId)) {
    const node = well.parts[0]?.nodes[target === 'collar' ? 0 : 1]
    if (!node) continue
    const d = Math.hypot(node.x-p.x,node.y-p.y)
    if (d < bestDistance) { bestDistance = d; best = { x: node.x, y: node.y, anchor: { wellId: well.id, target } } }
  }
  return best
}
export function boundWells(object: MapObject): string[] { return [...new Set(object.parts.flatMap(p => p.nodes.flatMap(n => n.anchor ? [n.anchor.wellId] : [])))] }
export function mapSegments(object: MapObject) { return object.parts.flatMap((part, pi) => part.nodes.slice(1).map((b, i) => ({ id: `${part.nodes[i]!.id}:${b.id}`, name: `Часть ${pi+1} · сегмент ${i+1}`, a: part.nodes[i]!, b, wells: object.segmentWells?.[`${part.nodes[i]!.id}:${b.id}`] ?? [] }))) }
export function keepSegmentWells(object: MapObject): MapObject {
  if (!object.segmentWells) return object
  const ids = new Set(mapSegments(object).map(s => s.id))
  return { ...object, segmentWells: Object.fromEntries(Object.entries(object.segmentWells).filter(([id]) => ids.has(id))) }
}
