import { describe, expect, it } from 'vitest'
import { sectionWellSources } from '../model/fixtures'
import { fitBrokenProfile, fitProfile, pointAtDepth, profileIssues, profileLength, projectToProfile } from './profile'

describe('directed local section profile', () => {
  it('fits a vertical line by orthogonal distance, retaining direction and end margins', () => {
    const result = fitProfile([{ x: 7, y: 10 }, { x: 7, y: 30 }], 5, 8)
    expect(result[0]!.x).toBeCloseTo(7); expect(result[0]!.y).toBeCloseTo(5)
    expect(result[1]!.x).toBeCloseTo(7); expect(result[1]!.y).toBeCloseTo(38)
    const reversed = fitProfile([{ x: 7, y: 30 }, { x: 7, y: 10 }], 5, 8)
    expect(reversed[0]!.y).toBeCloseTo(35); expect(reversed[1]!.y).toBeCloseTo(2)
  })
  it('projects onto a broken profile and reverses station without changing distance', () => {
    const profile = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 20 }]
    const result = projectToProfile({ x: 13, y: 8 }, profile)
    expect(result.station).toBe(18); expect(result.distance).toBe(3)
    expect(projectToProfile({ x: 13, y: 8 }, [...profile].reverse()).station).toBe(12)
    expect(profileLength(profile)).toBe(30)
  })
  it('intersects fitted segments and rejects parallel or ambiguous inputs', () => {
    const result = fitBrokenProfile([[{ x: 0, y: 0 }, { x: 10, y: 0 }], [{ x: 10, y: 0 }, { x: 10, y: 10 }]], 0, 0)
    expect(result).toHaveLength(3); expect(result[1]!.x).toBeCloseTo(10); expect(result[1]!.y).toBeCloseTo(0)
    expect(() => fitBrokenProfile([[{ x: 0, y: 0 }, { x: 10, y: 0 }], [{ x: 0, y: 5 }, { x: 10, y: 5 }]])).toThrow('параллельны')
    expect(() => fitProfile([{ x: 1, y: 1 }, { x: 1, y: 1 }])).toThrow('совпадают')
    expect(profileIssues([{ x: 0, y: 0 }, { x: 0, y: 0 }])).toHaveLength(1)
  })
  it('interpolates MD to XYZ on an inclined well without treating depth as height', () => {
    const well = sectionWellSources[1]!, bottom = pointAtDepth(well, well.depth), middle = pointAtDepth(well, well.depth / 2)
    expect(middle.x).toBeCloseTo((well.collar.x + bottom.x) / 2)
    expect(middle.z).toBeCloseTo((well.collar.z + bottom.z) / 2)
    expect(bottom.z).not.toBe(-well.depth)
    expect(() => pointAtDepth(well, well.depth + 1)).toThrow('выходит')
  })
})
