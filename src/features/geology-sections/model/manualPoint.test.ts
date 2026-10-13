import { describe, expect, it } from 'vitest'
import type { SectionGraphic } from '../../../entities/geology-section/model/types'
import { initialSections } from '../../../entities/geology-section/model/fixtures'
import { moveManualPoint } from './manualPoint'

const parent: SectionGraphic = { id: 'p', type: 'lithology', name: 'Область', rock: 'sand', closed: true, smooth: false, reversed: false, points: [{ x: 10, z: 0 }, { x: 100, z: 0 }, { x: 50, z: -30 }] }
describe('manual graphic point movement', () => {
  it('moves one vertex without mutating input and does not snap to its own old outline', () => {
    const s = initialSections()[0]!; s.wellIds = []; s.graphics = [parent]
    const result = moveManualPoint(s, parent, 0, { x: 11, z: 1 }, true)
    expect(result.issues).toEqual([])
    expect(result.graphic.points).toEqual([{ x: 11, z: 1 }, ...parent.points.slice(1)])
    expect(parent.points[0]).toEqual({ x: 10, z: 0 })
  })
  it('validates the parent and all exclusions when a parent vertex moves', () => {
    const s = initialSections()[0]!; s.graphics = [parent, { ...parent, id: 'h', parentId: 'p', name: 'Исключение', points: [{ x: 45, z: -5 }, { x: 55, z: -5 }, { x: 50, z: -10 }] }]
    const result = moveManualPoint(s, parent, 0, { x: 95, z: -20 }, false)
    expect(result.issues.join(' ')).toContain('внутри родительской области')
  })
  it('rejects an exclusion moved outside its parent and an oxidation point outside the profile', () => {
    const s = initialSections()[0]!, hole = { ...parent, id: 'h', parentId: 'p', name: 'Исключение', points: [{ x: 45, z: -5 }, { x: 55, z: -5 }, { x: 50, z: -10 }] }
    s.graphics = [parent, hole]
    expect(moveManualPoint(s, hole, 0, { x: 0, z: 0 }, false).issues.join(' ')).toContain('внутри родительской области')
    const line = { ...parent, type: 'oxidation' as const, closed: false, points: parent.points.slice(0, 2) }
    s.graphics = [line]
    expect(moveManualPoint(s, line, 0, { x: -1, z: 0 }, false).issues.join(' ')).toContain('рабочих высот')
  })
})
