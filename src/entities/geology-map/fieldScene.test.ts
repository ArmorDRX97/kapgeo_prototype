import { describe, expect, it } from 'vitest'
import { depositField, fieldProfiles, fieldSectionScene, FIELD_WELL_COUNT } from './fieldScene'
import { projectSchema } from './model'
import { wellTypes } from './wellSymbols'
import { mapSegments } from './anchors'

describe('large local deposit field', () => {
  it('contains exactly 8215 unique wells, all legend types and valid anchored geometry', () => {
    const wells = depositField.objects.filter(o => o.kind === 'well')
    expect(wells).toHaveLength(FIELD_WELL_COUNT)
    expect(new Set(wells.map(w => w.name)).size).toBe(FIELD_WELL_COUNT)
    expect(new Set(wells.map(w => w.id)).size).toBe(FIELD_WELL_COUNT)
    expect([...new Set(wells.map(w => w.attributes.type))].sort()).toEqual(wellTypes.map(t => t.name).sort())
    expect(projectSchema.safeParse(depositField).error?.issues).toBeUndefined()
    expect(fieldProfiles.length).toBeGreaterThan(30)
    const ids = new Set(wells.map(w => w.id))
    for (const profile of fieldProfiles) for (const segment of mapSegments(profile)) {
      expect(segment.wells.length).toBeGreaterThan(1)
      expect(segment.wells.every(id => ids.has(id))).toBe(true)
      expect(segment.a.anchor?.target).toBe('collar')
      expect(segment.b.anchor?.target).toBe('collar')
    }
  })
  it('uses identical well positions and profiles in sections while excluding regions and blocks', () => {
    const scene = fieldSectionScene()
    expect(scene.objects.filter(o => o.kind === 'well')).toEqual(depositField.objects.filter(o => o.kind === 'well'))
    expect(scene.objects.filter(o => o.kind === 'profile')).toEqual(fieldProfiles)
    expect(scene.objects.every(o => o.kind === 'well' || o.kind === 'profile')).toBe(true)
  })
  it('forms a dense diagonal main field, a separate northern group and sparse outliers', () => {
    const wells = depositField.objects.filter(o => o.kind === 'well')
    const main = wells.filter(o => /^field-well-p[0-8]-/.test(o.id))
    const north = wells.filter(o => /^field-well-p(?:9|10|11)-/.test(o.id))
    const outliers = wells.filter(o => o.id.startsWith('field-well-p12-'))
    expect(main).toHaveLength(6600)
    expect(north).toHaveLength(1200)
    expect(outliers).toHaveLength(415)
    expect(Math.min(...north.map(w => w.parts[0]!.nodes[0]!.x))).toBeGreaterThan(59500)
    const first = main.filter(w => w.id.startsWith('field-well-p0-')), last = main.filter(w => w.id.startsWith('field-well-p8-'))
    const mean = (list: typeof wells, axis: 'x' | 'y') => list.reduce((n, w) => n + w.parts[0]!.nodes[0]![axis], 0) / list.length
    expect(mean(first, 'x') - mean(last, 'x')).toBeGreaterThan(3500)
    expect(mean(last, 'y') - mean(first, 'y')).toBeGreaterThan(2800)
    expect(new Set(main.map(w => w.parts[0]!.nodes[0]!.x % 1)).size).toBeGreaterThan(80)
    expect(fieldProfiles.every(p => p.style.width >= 1.2)).toBe(true)
  })
})
