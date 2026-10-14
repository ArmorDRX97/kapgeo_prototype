import { describe, expect, it } from 'vitest'
import { initialSections, sectionWellSources } from '../../../entities/geology-section/model/fixtures'
import { correlationIssues, layerAnchors, pinchBounds, sourceAnchorPoint } from '../../../entities/geology-section/lib/correlation'
import { correlationHandles, moveCorrelationHandle } from './correlationHandles'
import { referenceSection } from '../../../entities/geology-section/model/referenceSection'

describe('correlation handle constraints', () => {
  it('moves bottom extensions only vertically while preserving original interval coordinates',()=>{
    const section=initialSections()[0]!,well=sectionWellSources[0]!
    section.sourceOverrides={[well.id]:{revision:1,technology:[{id:'near-bottom',from:140,to:143,kind:'permeable'}],ore:well.ore,uncorrected:well.uncorrected,offbalance:well.offbalance}}
    section.participation.technology=[well.id]
    const anchor=layerAnchors(section,'technology')[0]!,source=sourceAnchorPoint(section,anchor,'bottom')
    section.bottomExtensions={[anchor.id]:source.z-1}
    const handle=correlationHandles(section,'technology',anchor.id).find(h=>h.kind==='extension')!
    const next=moveCorrelationHandle(section,'technology',handle,{x:999,z:source.z-2})
    expect(correlationIssues(next,'technology')).toEqual([])
    expect(layerAnchors(next,'technology')[0]!.bottom).toEqual({x:source.x,z:source.z-2})
    expect(sourceAnchorPoint(next,layerAnchors(next,'technology')[0]!,'bottom')).toEqual(source)
    const invalid=moveCorrelationHandle(section,'technology',handle,{x:999,z:source.z+1})
    expect(correlationIssues(invalid,'technology').length).toBeGreaterThan(0)
  })
  it('exposes arc points instead of ignored pinches on connected reference sides and restores pinches after unlinking', () => {
    const section = referenceSection(), selection = 'GTR-W2/technology/REF-T-U'
    const connected = correlationHandles(section, 'technology', selection)
    expect(connected.some(handle => handle.target.type === 'arc')).toBe(true)
    expect(connected.some(handle => handle.target.type === 'pinch')).toBe(false)
    const unlinked = { ...section, links: { ...section.links, technology: section.links.technology.filter(link => link.a !== selection && link.b !== selection) } }
    const restored = correlationHandles(unlinked, 'technology', selection)
    expect(restored.filter(handle => handle.target.type === 'pinch').map(handle => handle.id)).toEqual(['pinch-left', 'pinch-right'])
    expect(restored.some(handle => handle.target.type === 'arc')).toBe(false)
    expect(moveCorrelationHandle(section, 'technology', restored.find(handle => handle.id === 'pinch-right')!, { x: 70, z: -460 })).toBe(section)
  })
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
    expect(correlationHandles(section, 'technology', a.id).filter(handle => handle.target.type === 'pinch')).toHaveLength(2)
    const handle = correlationHandles(section, 'technology', a.id).find(h => h.target.type === 'arc')!
    const moved = moveCorrelationHandle(section, 'technology', handle, { x: 1000, z })
    expect(moved.arcEdits!.technology![0]!.points[0]!.x).toBeCloseTo(Math.max(a.top.x, b.top.x) - .001)
    expect(correlationIssues(moved, 'technology')).toEqual([])
    const invalid = moveCorrelationHandle(section, 'technology', handle, { x, z: section.bottom })
    expect(correlationIssues(invalid, 'technology').join(' ')).toContain('пересекаются')
  })
})
