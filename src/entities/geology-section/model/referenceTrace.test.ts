import { expect, it } from 'vitest'
import { referenceSection } from './referenceSection'
import { previousReferenceTrace, referenceTrace } from './referenceTrace'
import { sectionSources, stationAtDepth } from '../lib/correlation'
import { profileLength } from '../lib/profile'

it('has three connected segments with visible turns and preserves the original section length', () => {
  expect(referenceTrace).toHaveLength(4)
  expect(profileLength(referenceTrace)).toBeCloseTo(profileLength(previousReferenceTrace), 8)
  const angles = referenceTrace.slice(1).map((p, i) => Math.atan2(p.y - referenceTrace[i]!.y, p.x - referenceTrace[i]!.x) * 180 / Math.PI)
  expect(Math.abs(angles[1]! - angles[0]!)).toBeGreaterThan(45)
  expect(Math.abs(angles[2]! - angles[1]!)).toBeGreaterThan(45)
})
it('bends wells with the trace while preserving stations, depths and geological intervals', () => {
  const bent = referenceSection(), old = { ...bent, demoPreset: 'video-reference-v4' as const, profile: previousReferenceTrace, segmentWells: { 'GTR-01-v1:GTR-01-v2': ['GTR-W1', 'GTR-W2', 'GTR-W3', 'GTR-W4'], 'GTR-01-v2:GTR-01-v3': ['GTR-W5', 'GTR-W6', 'GTR-W7'] } }
  for (const well of sectionSources(bent).filter(w => bent.wellIds.includes(w.id))) {
    const previous = sectionSources(old).find(w => w.id === well.id)!
    expect(well.depth).toBe(previous.depth)
    expect(well.technology).toEqual(previous.technology)
    expect(well.ore).toEqual(previous.ore)
    for (const md of [0, well.depth / 2, well.depth]) {
      const a = stationAtDepth(bent, well, md), b = stationAtDepth(old, previous, md)
      expect(a.x).toBeCloseTo(b.x, 7)
      expect(a.z).toBe(b.z)
    }
  }
})
