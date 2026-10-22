import { describe, expect, it } from 'vitest'
import { referenceSection } from './referenceSection'
import { referenceWellSources } from './referenceSources'
import { correlationIssues, layerPolygons } from '../lib/correlation'
import { graphicIssues } from '../lib/geometry'
import { validateSection } from '../../../repository/demo/sectionRepository'
import { sectionSegments } from '../lib/segments'

describe('video reference demonstration', () => {
  it('is a valid editable document with distinct layers, branches and interior holes', () => {
    const section = referenceSection()
    for (const layer of ['technology', 'ore', 'uncorrected', 'offbalance'] as const) {
      expect(correlationIssues(section, layer), layer).toEqual([])
      expect(layerPolygons(section, layer).length, layer).toBeGreaterThan(0)
    }
    for (const graphic of section.graphics) expect(graphicIssues(graphic, section), graphic.id).toEqual([])
    expect(validateSection(section)).toEqual(section)
    expect(layerPolygons(section, 'technology').some(polygon => polygon.length > 1)).toBe(true)
    expect(layerPolygons(section, 'ore').some(polygon => polygon.length > 1)).toBe(true)
    expect(section.graphics.filter(graphic => graphic.parentId)).toHaveLength(2)
    expect(section.graphics.filter(graphic => graphic.type === 'oxidation')).toHaveLength(3)
    expect(section.drawings).toHaveLength(2)
  })
  it('contains deterministic source curves and independent geometries without real identifiers', () => {
    expect(referenceSection()).toEqual(referenceSection())
    expect(referenceWellSources).toHaveLength(14)
    for (const well of referenceWellSources) {
      expect(well.name).toMatch(/^ГС-1\d{2}$/)
      for (const layer of ['technology', 'ore', 'uncorrected', 'offbalance'] as const) {
        for (const interval of well[layer]) {
          expect(interval.from).toBeGreaterThan(0)
          expect(interval.to).toBeGreaterThan(interval.from)
          expect(interval.to).toBeLessThanOrEqual(well.depth)
        }
      }
      expect(well.curves.every(curve => curve.samples.length > 250)).toBe(true)
    }
  })
  it('assigns the seven example wells to three ordered segments', () => {
    const section = referenceSection(), segments = sectionSegments(section)
    expect(segments[0]?.wellIds).toEqual(['GTR-W1', 'GTR-W2'])
    expect(segments[1]?.wellIds).toEqual(['GTR-W3', 'GTR-W4', 'GTR-W5'])
    expect(segments[2]?.wellIds).toEqual(['GTR-W6', 'GTR-W7'])
  })
})
