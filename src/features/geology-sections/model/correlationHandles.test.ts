import { describe, expect, it } from 'vitest'
import { initialSections } from '../../../entities/geology-section/model/fixtures'
import { correlationIssues, layerAnchors, pinchBounds } from '../../../entities/geology-section/lib/correlation'
import { correlationHandles, moveCorrelationHandle } from './correlationHandles'

describe('correlation handle constraints', () => {
  it('clamps a pinch to neighbours/heights and preserves measured source contacts', () => {
    const section = initialSections()[0]!, anchor = layerAnchors(section, 'technology')[0]!, handles = correlationHandles(section, 'technology', anchor.id)
    const next = moveCorrelationHandle(section, 'technology', handles[0]!, { x: -200, z: 100 })
    expect(next.contourEdits!.technology![0]).toMatchObject({ x: pinchBounds(section, 'technology', anchor, 'left').min, z: section.top, boundary: false })
    expect(layerAnchors(next, 'technology')).toEqual(layerAnchors(section, 'technology'))
    expect(section.contourEdits).toBeUndefined()
    expect(correlationIssues(next, 'technology')).toEqual([])
    expect(correlationHandles(section, 'technology', 'missing')).toEqual([])
  })
  it('moves boundary contacts vertically and rejects inverted thickness at commit validation', () => {
    const section = initialSections()[0]!, anchor = layerAnchors(section, 'technology')[0]!
    section.contourEdits = { technology: [{ anchorId: anchor.id, side: 'left', boundary: true, x: 0, z: -7.5, boundaryTop: -4, boundaryBottom: -11 }] }
    const top = correlationHandles(section, 'technology', anchor.id).find(h => h.id === 'boundary-left-top')!
    const next = moveCorrelationHandle(section, 'technology', top, { x: 200, z: -5 })
    expect(next.contourEdits!.technology![0]).toMatchObject({ x: 0, boundaryTop: -5, boundaryBottom: -11 })
    expect(correlationIssues(next, 'technology')).toEqual([])
    const invalid = moveCorrelationHandle(section, 'technology', top, { x: 200, z: -12 })
    expect(correlationIssues(invalid, 'technology').join(' ')).toContain('положительную мощность')
  })
  it('keeps auxiliary arc points ordered between fixed endpoints and validates crossing arcs', () => {
    const section = initialSections()[0]!, anchors = layerAnchors(section, 'technology'), a = anchors[0]!, b = anchors.find(p => p.wellId === 'GTR-W2')!
    section.links.technology = [{ id: 'link', a: a.id, b: b.id }]
    const x = (a.top.x + b.top.x) / 2, z = (a.top.z + b.top.z) / 2
    section.arcEdits = { technology: [{ linkId: 'link', edge: 'top', smooth: false, points: [{ x, z }] }] }
    const handle = correlationHandles(section, 'technology', a.id).find(h => h.target.type === 'arc')!
    const moved = moveCorrelationHandle(section, 'technology', handle, { x: 1000, z })
    expect(moved.arcEdits!.technology![0]!.points[0]!.x).toBeCloseTo(Math.max(a.top.x, b.top.x) - .001)
    expect(correlationIssues(moved, 'technology')).toEqual([])
    const invalid = moveCorrelationHandle(section, 'technology', handle, { x, z: section.bottom })
    expect(correlationIssues(invalid, 'technology').join(' ')).toContain('пересекаются')
  })
})
