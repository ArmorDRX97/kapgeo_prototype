import { expect, it } from 'vitest'
import { referenceSection } from '../model/referenceSection'
import { sectionSegments, reconcileProfile } from './segments'
import { segmentRadius, withSegmentRadius } from './segmentRadius'

it('stores independent segment radii, preserves zero and inherits the old profile setting', () => {
  const doc = referenceSection(), [a, b] = sectionSegments(doc)
  expect(segmentRadius(doc, a!.id)).toBe(20)
  const next = withSegmentRadius(doc, a!.id, 35)
  expect(segmentRadius(next, a!.id)).toBe(35)
  expect(segmentRadius(next, b!.id)).toBe(20)
  expect(segmentRadius(withSegmentRadius(next, a!.id, 0), a!.id)).toBe(0)
  expect(withSegmentRadius(next, a!.id, -1)).toBe(next)
  expect(withSegmentRadius(next, a!.id, NaN)).toBe(next)
})
it('keeps the radius with a moved segment and removes the setting when its edge is removed', () => {
  const doc = referenceSection(), a = sectionSegments(doc)[0]!, next = withSegmentRadius(doc, a.id, 45)
  const moved = reconcileProfile(next, { ...next, profile: next.profile.map((p, i) => i === 1 ? { ...p, y: p.y + 5 } : p) }).section
  expect(segmentRadius(moved, sectionSegments(moved)[0]!.id)).toBe(45)
  const removed = reconcileProfile(next, { ...next, profile: [next.profile[0]!, next.profile[2]!] }).section
  expect(removed.segmentRadiiM).toEqual({})
})
