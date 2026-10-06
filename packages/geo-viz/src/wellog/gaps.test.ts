import { describe, expect, it } from 'vitest'
import { decimate } from './decimate'
import { valueAtDepth } from './sample'

describe('Canvas numerical data integrity', () => {
  it('retains explicit separators when reducing long curves and does not lose peaks', () => {
    const depths = Float64Array.from({ length: 20000 }, (_, i) => i / 10)
    const values = Float64Array.from(depths, (_, i) => i > 9000 && i < 9500 ? Number.NaN : i === 7500 ? 100 : 1)
    const reduced = decimate({ depths, values }, 600)
    expect(Array.from(reduced.values).some(Number.isNaN)).toBe(true)
    expect(Array.from(reduced.values).some(v => v === 100)).toBe(true)
    expect(reduced.values.length).toBeLessThan(1300)
  })
  it('does not interpolate through a gap and returns exact finite points', () => {
    const data = { depths: [0, 1, 2, 3], values: [10, Number.NaN, 20, 30] }
    expect(valueAtDepth(data, 0.5)).toBeUndefined()
    expect(valueAtDepth(data, 0)).toBe(10)
    expect(valueAtDepth(data, 2.5)).toBe(25)
  })
})
