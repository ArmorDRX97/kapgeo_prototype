import { describe, expect, it } from 'vitest'
import { initialSections, sectionWellSources } from '../model/fixtures'
import { adjacentAnchors, correlationIssues, layerAnchors, layerPolygons, pinchPoint } from './correlation'
import { repairSection } from './repair'
import { graphicIssues, snappedPoint } from './geometry'
import { drawingLayout, drawingTable, newDrawing } from './drawing'
import { sampleArc } from './curves'
import { mayExtendBottom, stationAtDepth } from './correlation'
import { resolveGraphicPoints } from './boundaries'
import type { SectionGraphic } from '../model/types'
import { profileChangeIssues } from './profileChange'

describe('section topology and local correction', () => {
  it('snaps to included well lithology contacts without accepting hidden or excluded contacts', () => {
    const s = initialSections()[0]!, well = sectionWellSources[0]!, contact = stationAtDepth(s, well, well.lithology[0]!.to)
    const near = { x: contact.x + .2, z: contact.z + .1 }
    expect(snappedPoint(near, s).point).toEqual(contact)
    expect(snappedPoint(near, s).label).toContain(well.name)
    expect(snappedPoint(near, { ...s, wellIds: [] }).point).toEqual(near)
    expect(snappedPoint(near, { ...s, top: contact.z - 1 }).point).toEqual(near)
  })
  it('continues a horizon to a vertical boundary interval and restores pinchout on disconnect', () => {
    const s = initialSections()[0]!, a = layerAnchors(s, 'technology')[0]!
    s.contourEdits = { technology: [{ anchorId: a.id, side: 'left', x: 0, z: (a.top.z + a.bottom.z) / 2, boundary: true, boundaryTop: a.top.z, boundaryBottom: a.bottom.z }] }
    expect(correlationIssues(s, 'technology')).toEqual([])
    const points = layerPolygons(s, 'technology').flat(2)
    expect(points).toContainEqual({ x: 0, z: a.top.z }); expect(points).toContainEqual({ x: 0, z: a.bottom.z })
    s.contourEdits.technology![0]!.boundaryBottom = a.top.z
    expect(correlationIssues(s, 'technology').join(' ')).toContain('положительную мощность')
    s.contourEdits.technology = []
    expect(layerPolygons(s, 'technology').flat(2).some(p => p.x === 0)).toBe(false)
  })
  it('reports manual graphics and drawing ranges before shortening a profile', () => {
    const s = initialSections()[0]!
    s.graphics = [{ id: 'line', type: 'oxidation', name: 'Зона', points: [{ x: 10, z: 0 }, { x: 300, z: 0 }], closed: false, reversed: false, smooth: false }]
    s.drawings = [newDrawing(s, 'd')]
    const original = structuredClone(s.profile)
    const issues = profileChangeIssues(s, [{ x: 0, y: 0 }, { x: 100, y: 0 }])
    expect(issues.some(i => i.startsWith('Зона:'))).toBe(true)
    expect(issues.some(i => i.includes('граница чертежа'))).toBe(true)
    expect(s.profile).toEqual(original)
  })
  it('seeds quarter-distance pinchouts and unions 1:N without changing source MD', () => {
    const s = initialSections()[0]!, anchors = layerAnchors(s, 'technology'), a = anchors[0]!, neighbors = anchors.filter(b => adjacentAnchors(s, 'technology', a, b))
    expect(pinchPoint(s, 'technology', a, 'left').x).toBeCloseTo((a.top.x + a.bottom.x) / 2 * .75)
    const before = layerPolygons(s, 'technology')
    s.links.technology = neighbors.map(b => ({ id: b.id, a: a.id, b: b.id }))
    expect(correlationIssues(s, 'technology')).toEqual([])
    expect(layerPolygons(s, 'technology').length).toBeLessThan(before.length)
    expect(layerAnchors(s, 'technology')[0]!.from).toBe(a.from)
    expect(sectionWellSources[0]!.technology[0]!.from).toBe(109)
  })
  it('rejects non-neighbor links and out-of-bounds pinchouts', () => {
    const s = initialSections()[0]!, a = layerAnchors(s, 'technology')[0]!, b = layerAnchors(s, 'technology').find(p => p.wellId === s.wellIds[3])!
    s.links.technology = [{ id: 'bad', a: a.id, b: b.id }]
    expect(correlationIssues(s, 'technology')).toHaveLength(1)
    s.links.technology = []; s.contourEdits = { technology: [{ anchorId: a.id, side: 'left', x: a.top.x + 50, z: -2, boundary: false }] }
    expect(correlationIssues(s, 'technology')).toHaveLength(1)
  })
  it('repairs deleted local source references while preserving other layers and manual graphics', () => {
    const s = initialSections()[0]!, a = layerAnchors(s, 'ore')[0]!, b = layerAnchors(s, 'ore').find(p => adjacentAnchors(s, 'ore', a, p))!, w = sectionWellSources[0]!
    s.links.ore = [{ id: 'link', a: a.id, b: b.id }]
    s.sourceOverrides = { [w.id]: { revision: 2, technology: w.technology, ore: [], uncorrected: w.uncorrected, offbalance: w.offbalance } }
    const repaired = repairSection(s)
    expect(repaired.section.links.ore).toEqual([]); expect(repaired.changes).toHaveLength(1)
    expect(repaired.section.participation.technology).toEqual(s.participation.technology)
    expect(repaired.section.sourceRevisions[w.id]).toBe(2)
    expect(s.links.ore).toHaveLength(1)
  })
  it('validates self-intersections, strictly contained holes and references', () => {
    const s = initialSections()[0]!, parent: SectionGraphic = { id: 'p', name: 'Область', type: 'lithology', closed: true, reversed: false, smooth: false, points: [{ x: 10, z: 0 }, { x: 100, z: 0 }, { x: 100, z: -30 }, { x: 10, z: -30 }], rock: 'sand' }
    s.graphics = [parent]
    expect(graphicIssues(parent, s)).toEqual([])
    const hole = { ...parent, id: 'h', parentId: 'p', points: [{ x: 20, z: -5 }, { x: 30, z: -5 }, { x: 25, z: -10 }] }
    expect(graphicIssues(hole, s)).toEqual([])
    expect(graphicIssues({ ...hole, points: [{ x: 0, z: -5 }, { x: 30, z: -5 }, { x: 25, z: -10 }] }, s).length).toBeGreaterThan(0)
    expect(graphicIssues({ ...parent, points: [parent.points[0]!, parent.points[2]!, parent.points[1]!, parent.points[3]!] }, s)).toContain('Самопересечение линии недопустимо.')
  })
  it('calculates physical scale and sheet pagination independently from screen zoom', () => {
    const s = initialSections()[0]!, d = { ...newDrawing(s, 'd'), left: 0, right: 500, horizontalScale: 1000, top: 0, bottom: -50, verticalScale: 500, paper: 'A4' as const, landscape: true }
    const layout = drawingLayout(d)
    expect(layout.contentWidth).toBeCloseTo(508.4); expect(layout.contentHeight).toBeCloseTo(175.4)
    expect(layout.columns).toBe(2); expect(layout.rows).toBe(1)
    expect(() => drawingLayout({ ...d, horizontalScale: 1 })).toThrow('100 листов')
    const tiled = drawingLayout({ ...d, bottom: -200, overlap: 10, pageOrder: 'columns' })
    expect(tiled.strideX).toBe(tiled.availableWidth - 10)
    expect(tiled.pages[1]).toMatchObject({ column: 0, row: 1 })
    const centered = drawingLayout({ ...d, horizontalScale: 5000, center: true })
    expect(centered.offsetX).toBeGreaterThan(0)
    const origin = centered.pages[0]!
    expect(origin.originX).toBeCloseTo((centered.width - centered.contentWidth) / 2)
    expect(origin.originY - (d.margin + 12)).toBeCloseTo(centered.height - d.margin - origin.originY - centered.contentHeight)
    expect(tiled.pages[1]!.originY - tiled.pages[0]!.originY).toBeCloseTo(-tiled.strideY)
  })
  it('prints all ore intervals across multiple table lines and excludes geometric auxiliary supports', () => {
    const s = initialSections()[0]!, w = sectionWellSources[0]!
    s.sourceOverrides = { [w.id]: { revision: 2, technology: w.technology, ore: Array.from({ length: 6 }, (_, i) => ({ id: `ore-${i}`, from: 112 + i * .2, to: 112.1 + i * .2, kind: 'permeable' })), uncorrected: [], offbalance: [] } }
    s.auxiliary = [{ id: 'virtual', wellId: w.id, layer: 'ore', from: 145, to: 147 }]
    const table = drawingTable(s, newDrawing(s, 'd'))
    expect(table.rows[0]!.labels).toHaveLength(3)
    expect(table.rows[0]!.labels.join(';')).not.toContain('145')
    expect(table.lineCount).toBe(s.wellIds.length + 2)
  })
  it('keeps source anchors and knots fixed when smoothing an auxiliary arc', () => {
    const points = [{ x: 0, z: 3 }, { x: 10, z: 6 }, { x: 20, z: 4 }], sampled = sampleArc(points, true)
    expect(sampled[0]).toEqual(points[0]); expect(sampled.at(-1)).toEqual(points[2]); expect(sampled).toContainEqual(points[1])
    expect(sampled.every(p => p.z >= 3 && p.z <= 6)).toBe(true)
    expect(sampleArc(points, false)).toEqual(points)
  })
  it('uses inclusive 3 m / 0.5 m continuation thresholds and rejects intervals beyond the bottom', () => {
    const w = sectionWellSources[0]!
    expect(mayExtendBottom(w, 'technology', w.depth - 3)).toBe(true)
    expect(mayExtendBottom(w, 'technology', w.depth - 3.001)).toBe(false)
    expect(mayExtendBottom(w, 'ore', w.depth - .5)).toBe(true)
    expect(mayExtendBottom(w, 'ore', w.depth - .501)).toBe(false)
    expect(mayExtendBottom(w, 'ore', w.depth + .1)).toBe(false)
  })
  it('resolves standalone foundation from the lower linked contour arc', () => {
    const s = initialSections()[0]!, a = layerAnchors(s, 'technology')[0]!, b = layerAnchors(s, 'technology').find(p => adjacentAnchors(s, 'technology', a, p))!
    s.links.technology = [{ id: 'l', a: a.id, b: b.id }]
    const g: SectionGraphic = { id: 'foundation', type: 'foundation', name: 'Фундамент', points: [], contourLinks: ['l'], closed: false, reversed: false, smooth: false }
    expect(resolveGraphicPoints(g, s)).toEqual([a.bottom, b.bottom])
  })
  it('clips corrected ore to permeable technology while retaining the uncorrected source', () => {
    const s = initialSections()[0]!, w = sectionWellSources[0]!
    s.sourceOverrides = { [w.id]: { revision: 2, technology: [{ id: 'narrow', from: 112, to: 113, kind: 'permeable' }], ore: w.ore, uncorrected: w.uncorrected, offbalance: w.offbalance } }
    const corrected = layerAnchors(s, 'ore').filter(a => a.wellId === w.id)
    expect(corrected.map(a => [a.from, a.to])).toEqual([[112, 113]])
    expect(layerAnchors(s, 'uncorrected').filter(a => a.wellId === w.id).map(a => [a.from, a.to])).toEqual([[110, 115], [122, 128]])
    expect(s.sourceOverrides[w.id]!.ore).toEqual(w.ore)
  })
  it('preserves an interior hole in a split-and-rejoined 1:N horizon', () => {
    const s = initialSections()[0]!, wells = sectionWellSources.slice(0, 3)
    s.wellIds = wells.map(w => w.id); s.participation.technology = [...s.wellIds]
    s.sourceOverrides = Object.fromEntries(wells.map((w, i) => [w.id, { revision: 2, technology: i === 1 ? [{ id: 'upper', from: 109, to: 116, kind: 'permeable' }, { id: 'lower', from: 123, to: 130, kind: 'permeable' }] : [{ id: 'whole', from: 109, to: 130, kind: 'permeable' }], ore: [], uncorrected: [], offbalance: [] }]))
    const anchors = layerAnchors(s, 'technology'), left = anchors[0]!, right = anchors.at(-1)!, middle = anchors.filter(a => a.wellId === wells[1]!.id)
    s.links.technology = middle.flatMap((m, i) => [{ id: `left-${i}`, a: left.id, b: m.id }, { id: `right-${i}`, a: m.id, b: right.id }])
    expect(correlationIssues(s, 'technology')).toEqual([])
    expect(layerPolygons(s, 'technology').some(p => p.length > 1)).toBe(true)
  })
})
