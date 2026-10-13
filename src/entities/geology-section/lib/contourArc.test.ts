import { describe, expect, it } from 'vitest'
import { editContourArc, openRing, polygonIssues, ringKey, samePoint, selectContourArc } from './contourArc'
import { initialSections } from '../model/fixtures'
import { layerAnchors, rawLayerPolygons, layerPolygons, contourArcIssues } from './correlation'
import { repairSection } from './repair'
const ring = [{ x: 0, z: 0 }, { x: 2, z: 2 }, { x: 4, z: 0 }, { x: 4, z: -4 }, { x: 0, z: -4 }]
describe('selected arcs of closed contours', () => {
  it('selects complementary paths by physical length, including equal-length ties', () => {
    const short = selectContourArc(ring, 0, 2, 'short'), long = selectContourArc(ring, 0, 2, 'long')
    expect(short.indices).toEqual([0, 1, 2]); expect(long.indices).toEqual([0, 4, 3, 2]); expect(short.length).toBeLessThan(long.length)
    const square = [{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: -4 }, { x: 0, z: -4 }]
    expect(editContourArc(square, { ringKey: ringKey(square), start: 0, end: 2, route: 'short', operation: 'straight' }, square)).toHaveLength(4)
    expect(() => selectContourArc(ring, 0, 0, 'short')).toThrow('две разные')
  })
  it('straightens only the selected path and retains fixed contacts and the opposite path', () => {
    const edit = { ringKey: ringKey(ring), start: 0, end: 2, route: 'short' as const, operation: 'straight' as const }
    expect(editContourArc(ring, edit, [])).toEqual([ring[0], ring[2], ring[3], ring[4]])
    expect(editContourArc(ring, edit, [ring[1]!])).toEqual(ring)
    const smooth = editContourArc(ring, { ...edit, operation: 'smooth' }, [])
    expect(smooth.length).toBeGreaterThan(ring.length)
    for (const p of ring) expect(smooth.some(q => samePoint(p, q))).toBe(true)
    expect(openRing([...ring, ring[0]!])).toEqual(ring)
  })
  it('rejects intersections, bounds and holes touching an altered boundary', () => {
    const bounds = { length: 10, top: 10, bottom: -10 }
    expect(polygonIssues([ring], bounds)).toEqual([])
    expect(polygonIssues([[ring[0]!, ring[3]!, ring[2]!, ring[4]!]], bounds).join()).toContain('пересекает')
    expect(polygonIssues([ring], { ...bounds, top: 1 }).join()).toContain('границы')
    expect(polygonIssues([ring, [{ x: 3, z: -1 }, { x: 5, z: -1 }, { x: 3, z: -2 }]], bounds).join()).toContain('исключение')
  })
  it('preserves source contacts simplified out of an edge by polygon union', () => {
    const contact = { x: 1, z: 1 }
    const edit = { ringKey: ringKey(ring), start: 0, end: 2, route: 'short' as const, operation: 'straight' as const }
    const result = editContourArc(ring, edit, [contact])
    expect(result.some(p => samePoint(p, contact))).toBe(true)
    expect(result.slice(-2)).toEqual(ring.slice(-2))
    expect(polygonIssues([result], { length: 10, top: 10, bottom: -10 })).toEqual([])
    expect(editContourArc(ring, { ...edit, operation: 'smooth' }, [contact]).some(p => samePoint(p, contact))).toBe(true)
  })
  it('persists a ring operation independently of measured data and clears it when the source changes', () => {
    const s = initialSections()[0]!, raw = rawLayerPolygons(s, 'technology')[0]![0]!
    s.contourArcEdits = { technology: [{ ringKey: ringKey(raw), start: 0, end: 1, route: 'short', operation: 'straight' }] }
    const anchors = layerAnchors(s, 'technology')
    expect(contourArcIssues(s, 'technology')).toEqual([])
    expect(layerPolygons(s, 'technology').length).toBeGreaterThan(0)
    expect(layerAnchors(s, 'technology')).toEqual(anchors)
    s.participation.technology = s.participation.technology.slice(1)
    expect(contourArcIssues(s, 'technology').join()).toContain('изменился')
    const repaired = repairSection(s)
    expect(repaired.section.contourArcEdits?.technology).toEqual([])
    expect(repaired.changes.join()).toContain('сброшены операции')
  })
})
