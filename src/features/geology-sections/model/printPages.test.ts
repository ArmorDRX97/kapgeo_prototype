import { describe, expect, it } from 'vitest'
import { printPageIndices } from './printPages'

describe('drawing print selection', () => {
  it('prints all sheets by default and selects unique ranges in document order', () => {
    expect(printPageIndices('', 4)).toEqual([0, 1, 2, 3])
    expect(printPageIndices('4, 1–2, 2', 4)).toEqual([0, 1, 3])
  })
  it('rejects invalid, reversed and unavailable sheets before printing', () => {
    for (const value of ['0', '5', '3-1', '1,', '1.5', '1-1000000']) expect(() => printPageIndices(value, 4)).toThrow()
  })
})
