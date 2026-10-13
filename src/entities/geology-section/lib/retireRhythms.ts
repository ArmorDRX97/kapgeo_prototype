import type { GeologySection, SectionGraphic, XZ } from '../model/types'
import { linkArc } from './correlation'
import { sampleManualLine } from './curves'

type LegacyGraphic = Omit<SectionGraphic, 'type'> & { type: SectionGraphic['type'] | 'roof' | 'base'; unitId?: string; references?: string[] }
type LegacySection = Omit<GeologySection, 'graphics'> & { graphics: LegacyGraphic[]; units?: Array<{ id: string; name: string; description: string }> }

/** Read compatibility only. Never writes storage or changes a document revision on open. */
export function retireRhythms(legacy: LegacySection): GeologySection {
  const section = legacy as GeologySection
  const resolve = (g: LegacyGraphic, visited = new Set<string>()): XZ[] => {
    if (visited.has(g.id)) throw new Error('Циклическая ссылка в старой геометрии разреза.')
    const seen = new Set(visited).add(g.id)
    if (!g.contourLinks?.length && !g.references?.length) return g.smooth ? sampleManualLine(g.points, g.closed) : g.points
    const points = [...(g.contourLinks ?? []).flatMap(id => section.links.technology.some(l => l.id === id) ? linkArc(section, 'technology', id, g.type === 'roof' ? 'top' : 'bottom') : []),
      ...(g.references ?? []).flatMap(id => { const ref = legacy.graphics.find(item => item.id === id); return ref ? resolve(ref, seen) : [] }), ...g.points].sort((a, b) => a.x - b.x)
    return points.filter((p, i) => !i || Math.hypot(p.x - points[i - 1]!.x, p.z - points[i - 1]!.z) > 1e-7)
  }
  const next = { ...legacy }; delete next.units
  return { ...next, graphics: legacy.graphics.flatMap(g => {
    if (g.type === 'roof' || g.type === 'base') return []
    const graphic = { ...g, type: g.type }; delete graphic.unitId
    if (graphic.references?.length) {
      graphic.points = resolve(g); graphic.contourLinks = []; graphic.smooth = false
      graphic.contourSnapshot = graphic.points; graphic.detachedFromContour = true
    }
    delete graphic.references
    return [graphic]
  }), drawings: legacy.drawings.map(d => ({ ...d, layers: d.layers.filter(id => id !== 'roof' && id !== 'base' && id !== 'rhythm') })) }
}
