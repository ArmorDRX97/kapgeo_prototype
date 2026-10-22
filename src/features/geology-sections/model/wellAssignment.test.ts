import { describe, expect, it } from 'vitest'
import { referenceSection } from '../../../entities/geology-section/model/referenceSection'
import { sectionSegments, assignSegmentWell } from '../../../entities/geology-section/lib/segments'
import { repairSection } from '../../../entities/geology-section/lib/repair'
import { sectionSources } from '../../../entities/geology-section/lib/correlation'
import { validateSection } from '../../../repository/demo/sectionRepository'
import { assignWellToSegment, sectionWellCatalogue, segmentWellDistance } from './wellAssignment'
import { sectionPlan } from './sectionPlan'
import { changeSectionWells } from './wells'

function sample() {
  const section = referenceSection(), segment = sectionSegments(section)[0]!
  const well = sectionWellCatalogue(section).find(w => w.id.startsWith('field-well-') && segmentWellDistance(section, segment.id, w.collar) <= 20)!
  return { section, segment, well }
}
describe('map well assignment', () => {
  it('adds any displayed field well to the document, segment and geological tabs, without moving the fund', () => {
    const { section, segment, well } = sample(), before = structuredClone(section)
    expect(well).toBeDefined()
    const next = assignWellToSegment(section, segment.id, well.id)
    expect(next.wellIds).toContain(well.id)
    expect(next.segmentWells?.[segment.id]).toContain(well.id)
    expect(next.sourceRevisions[well.id]).toBe(1)
    expect(next.participation).toEqual(section.participation)
    expect(next.links).toEqual(section.links)
    expect(sectionSources(next).find(w => w.id === well.id)?.curves.length).toBeGreaterThan(0)
    expect(sectionSources(next).find(w => w.id === well.id)?.name).toBe(well.name)
    const scene = sectionPlan(next), original = sectionPlan(section)
    expect(scene.objects.filter(o => o.kind === 'well')).toHaveLength(8215)
    expect(new Set(scene.objects.map(o => o.id)).size).toBe(scene.objects.length)
    for (const object of original.objects.filter(o => o.kind === 'well')) expect(scene.objects.find(o => o.id === object.id)?.parts[0]?.nodes[0]).toMatchObject({ x: expect.closeTo(object.parts[0]!.nodes[0]!.x, 7), y: expect.closeTo(object.parts[0]!.nodes[0]!.y, 7) })
    expect(validateSection(JSON.parse(JSON.stringify(next))).wellIds).toContain(well.id)
    expect(section).toEqual(before)
  })
  it('rejects unknown and distant wells, and never duplicates repeated assignments', () => {
    const { section, segment, well } = sample()
    expect(assignWellToSegment(section, segment.id, 'unknown')).toBe(section)
    const distant = sectionWellCatalogue(section).find(w => segmentWellDistance(section, segment.id, w.collar) > 100)!
    expect(assignWellToSegment(section, segment.id, distant.id)).toBe(section)
    const next = assignWellToSegment(section, segment.id, well.id)
    expect(assignWellToSegment(next, segment.id, well.id).wellIds.filter(id => id === well.id)).toHaveLength(1)
  })
  it('moves between segments, unassigns without deleting, and can remove the well from the document', () => {
    const { section, segment, well } = sample(), other = sectionSegments(section)[1]!
    const next = assignWellToSegment(section, segment.id, well.id)
    const moved = assignWellToSegment({ ...next, segmentRadiiM: { [other.id]: 500 } }, other.id, well.id)
    expect(moved.segmentWells?.[segment.id]).not.toContain(well.id)
    expect(moved.segmentWells?.[other.id]).toContain(well.id)
    const removed = assignSegmentWell(moved, other.id, well.id, false)
    expect(removed.wellIds).toContain(well.id)
    expect(validateSection(repairSection(removed).section).wellIds).toContain(well.id)
    const excluded = changeSectionWells(removed, removed.wellIds.filter(id => id !== well.id))
    expect(validateSection(excluded).wellIds).not.toContain(well.id)
  })
})
