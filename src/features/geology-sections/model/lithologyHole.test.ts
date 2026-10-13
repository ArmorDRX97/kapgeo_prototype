import { describe, expect, it } from 'vitest'
import { initialSections } from '../../../entities/geology-section/model/fixtures'
import type { SectionGraphic } from '../../../entities/geology-section/model/types'
import { graphicIssues } from '../../../entities/geology-section/lib/geometry'
import { lithologyHole } from './lithologyHole'

describe('editable lithology exclusions', () => {
  it('finds a valid seed inside a concave parent and avoids an existing exclusion', () => {
    const section = initialSections()[0]!, parent: SectionGraphic = { id: 'p', type: 'lithology', name: 'Глина', rock: 'clay', closed: true, reversed: false, smooth: false,
      points: [{ x: 10, z: 0 }, { x: 90, z: 0 }, { x: 90, z: -10 }, { x: 30, z: -10 }, { x: 30, z: -40 }, { x: 10, z: -40 }] }
    section.graphics = [parent]
    const first = lithologyHole(section, parent, 'first')!
    expect(first).not.toBeNull(); expect(graphicIssues(first, { ...section, graphics: [...section.graphics, first] })).toEqual([])
    section.graphics.push(first)
    const second = lithologyHole(section, parent, 'second')!
    expect(second).not.toBeNull(); expect(second.points).not.toEqual(first.points)
    expect(graphicIssues(second, { ...section, graphics: [...section.graphics, second] })).toEqual([])
    expect(lithologyHole(section, first, 'nested')).toBeNull()
  })
})
