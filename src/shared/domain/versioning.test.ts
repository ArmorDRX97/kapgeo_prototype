import { describe, expect, it } from 'vitest'
import { scientificContentHash } from './versioning'

describe('scientificContentHash', () => {
  it('is stable for equivalent objects regardless of property order', () => {
    const first = scientificContentHash({ depth: 612.4, coordinates: { x: 468_146.8, y: 4_812_856.4 } })
    const second = scientificContentHash({ coordinates: { y: 4_812_856.4, x: 468_146.8 }, depth: 612.4 })

    expect(first).toBe(second)
  })

  it('changes when scientific content changes', () => {
    expect(scientificContentHash({ depth: 612.4 })).not.toBe(scientificContentHash({ depth: 613.4 }))
  })
})
