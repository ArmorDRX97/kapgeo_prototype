import { describe, expect, it } from 'vitest'
import { initialSections } from '../../../entities/geology-section/model/fixtures'
import { layerAnchors, linkArc, stationAtDepth } from '../../../entities/geology-section/lib/correlation'
import { referenceSection } from '../../../entities/geology-section/model/referenceSection'
import { addCanvasAuxiliary, correlationPointCommand, nearestEdge } from './canvasCommands'

describe('canvas commands', () => {
  it('selects the nearest existing segment, including the closing edge of a closed graphic', () => {
    const points = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 }]
    expect(nearestEdge(points, { x: 5, z: 1 })?.index).toBe(1)
    const closing = nearestEdge(points, { x: 5, z: 5 }, true)
    expect(closing).toMatchObject({ index: 3, a: points[2], b: points[0] })
  })

  it('inserts and deletes editable points while keeping connected source anchors fixed', () => {
    const section = referenceSection(), layer = 'technology' as const
    const anchors = layerAnchors(section, layer), a = anchors.find(anchor => anchor.id === section.links[layer][0]!.a)!, b = anchors.find(anchor => anchor.id === section.links[layer][0]!.b)!
    const link = section.links[layer][0]!, originalAnchors = anchors.map(anchor => ({ id: anchor.id, top: anchor.top, bottom: anchor.bottom })), originalEdits = structuredClone(section.arcEdits)
    const endpoints = linkArc(section, layer, link.id, 'top'), point = { x: (endpoints[0]!.x + endpoints.at(-1)!.x) / 2, z: (a.top.z + b.top.z) / 2 }
    const inserted = correlationPointCommand(section, layer, 'insert', point)
    expect(inserted.arcEdits?.[layer]?.find(edit => edit.linkId === link.id && edit.edge === 'top')?.points).toContainEqual(point)
    expect(section.arcEdits).toEqual(originalEdits)
    const moved = correlationPointCommand(inserted, layer, 'move', { x: point.x + 0.1, z: point.z + 0.1 })
    expect(layerAnchors(moved, layer).map(anchor => ({ id: anchor.id, top: anchor.top, bottom: anchor.bottom }))).toEqual(originalAnchors)
    const deleted = correlationPointCommand(inserted, layer, 'delete', point)
    expect(deleted.arcEdits?.[layer]?.find(edit => edit.linkId === link.id && edit.edge === 'top')?.points).not.toContainEqual(point)
    expect(section.arcEdits).toEqual(originalEdits)
  })

  it('adds a well-bound local interval from distinct heights and rejects equal heights', () => {
    const section = initialSections()[0]!, wellId = section.wellIds[0]!, well = sectionWellSources[0]!
    const at = stationAtDepth(section, well, 20), a = { x: at.x, z: at.z }, b = { x: at.x, z: at.z - 10 }
    const next = addCanvasAuxiliary(section, 'ore', a, b)
    expect(next.auxiliary?.at(-1)).toMatchObject({ wellId, layer: 'ore', from: 20, to: 30 })
    expect(next.participation.ore).toContain(wellId)
    expect(section.auxiliary).toBeUndefined()
    expect(() => addCanvasAuxiliary(section, 'ore', a, a)).toThrow()
  })
})

import { sectionWellSources } from '../../../entities/geology-section/model/fixtures'
