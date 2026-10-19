import { describe, expect, it } from 'vitest'
import { wellsWithinProfileRadius } from './wellProximity'

describe('well proximity to a section profile', () => {
  it('uses the wellhead, includes points within the selected radius, and sorts by distance', () => {
    const wells = [
      { id: 'far', collar: { x: 50, y: 21, z: 0 } },
      { id: 'near', collar: { x: 50, y: 5, z: 0 } },
      { id: 'end', collar: { x: 102, y: 0, z: 0 } },
    ]
    const matches = wellsWithinProfileRadius(wells, [{ x: 0, y: 0 }, { x: 100, y: 0 }], 20)
    expect(matches.map(item => item.well.id)).toEqual(['end', 'near'])
    expect(matches.map(item => item.distanceM)).toEqual([2, 5])
  })

  it('returns no candidates for an invalid radius', () => {
    expect(wellsWithinProfileRadius([{ id: 'well', collar: { x: 0, y: 0, z: 0 } }], [{ x: 0, y: 0 }, { x: 10, y: 0 }], -1)).toEqual([])
  })
})
