import { describe, expect, it } from 'vitest'
import { referenceSection } from '../../../entities/geology-section/model/referenceSection'
import { sectionSegments } from '../../../entities/geology-section/lib/segments'
import { sectionSources } from '../../../entities/geology-section/lib/correlation'
import { sectionPlan, fromFieldPoint, toFieldPoint } from './sectionPlan'

describe('one section, one plan profile', () => {
  it('keeps only the document trace and exactly its source coordinates and membership', () => {
    const doc = referenceSection(), scene = sectionPlan(doc), profiles = scene.objects.filter(o => o.kind === 'profile')
    expect(profiles).toHaveLength(1)
    expect(profiles[0]!.parts[0]!.nodes).toHaveLength(4)
    expect(scene.objects.filter(o => o.kind === 'well')).toHaveLength(8215)
    const segments = sectionSegments(doc)
    expect(segments[0]!.b).toEqual(segments[1]!.a)
    expect(segments.flatMap(s => s.wellIds)).toEqual(doc.wellIds)
    for (const w of sectionSources(doc).filter(w => doc.wellIds.includes(w.id))) {
      expect(scene.objects.find(o => o.id === w.id)!.parts[0]!.nodes[0]).toMatchObject(toFieldPoint(w.collar))
    }
  })
  it('preserves local lengths and round trips edits between the map and geological profile', () => {
    const points = [{ x: 0, y: 0 }, { x: 160, y: 3 }, { x: 350, y: -1 }]
    for (const p of points) { const restored = fromFieldPoint(toFieldPoint(p)); expect(restored.x).toBeCloseTo(p.x, 8); expect(restored.y).toBeCloseTo(p.y, 8) }
    const a = toFieldPoint(points[0]!), b = toFieldPoint(points[1]!)
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(Math.hypot(160, 3), 8)
  })
})
