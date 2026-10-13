import { expect, it } from 'vitest'
import { createSection, initialSections, sectionWellSources } from '../model/fixtures'
import { referenceWellSources } from '../model/referenceSources'
import { layerAnchors, mayExtendBottom, sectionSources, sourceFor, stationAtDepth, virtualStationAtDepth } from './correlation'
import { pointAtDepth, projectToProfile } from './profile'
import { snappedPoint } from './geometry'

it('resolves reference geometry and MD only for the explicit preset, retaining interval overrides', () => {
  const section = { ...createSection('REF', 'Опорный разрез'), demoPreset: 'video-reference-v1' as const, top: 200, bottom: -1000 }, original = sectionWellSources[0]!, reference = referenceWellSources.find(w => w.id === original.id)!
  expect(sourceFor(initialSections()[0]!, original)).toEqual(original)
  expect(sectionSources(section)).toEqual(referenceWellSources)
  expect(sourceFor(section, original)).toEqual(reference)
  const md = reference.depth - 1, point = pointAtDepth(reference, md)
  expect(md).toBeGreaterThan(original.depth)
  expect(stationAtDepth(section, original, md)).toEqual({ x: projectToProfile(point, section.profile).station, z: point.z })
  expect(virtualStationAtDepth(section, original, reference.depth + 2).z).toBeCloseTo(pointAtDepth(reference, reference.depth).z - 2)
  expect(mayExtendBottom(sourceFor(section, original), 'technology', md)).toBe(true)
  const interval = { id: 'custom-contact', from: md - 3, to: md, kind: 'permeable' as const }
  section.sourceOverrides = { [original.id]: { revision: 2, technology: [interval], ore: [], offbalance: [], uncorrected: [] } }
  section.participation.technology = [original.id]
  expect(sourceFor(section, original).technology).toEqual([interval])
  expect(layerAnchors(section, 'technology')).toEqual([expect.objectContaining({ id: `${original.id}/technology/custom-contact`, from: interval.from, to: interval.to, bottom: stationAtDepth(section, reference, md) })])
})

it('snaps to reference lithological contacts using their own measured depths', () => {
  const section = { ...createSection('REF', 'Опорный разрез'), demoPreset: 'video-reference-v1' as const, top: 200, bottom: -1000 }, reference = referenceWellSources[0]!
  section.wellIds = [reference.id]
  const md = reference.lithology.find(interval => interval.to > sectionWellSources[0]!.depth)!.to
  const contact = stationAtDepth(section, reference, md), result = snappedPoint({ x: contact.x + .001, z: contact.z + .001 }, section)
  expect(result.point).toEqual(contact)
  expect(result.label).toContain(reference.name)
})
