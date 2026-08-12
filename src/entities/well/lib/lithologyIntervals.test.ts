import { describe, expect, it } from 'vitest'
import type { GeologicalInterval } from '../model/types'
import { mergeLithologyIntervals, splitLithologyInterval } from './lithologyIntervals'

const interval: GeologicalInterval = { id: 'L-01', from: 120, to: 280, lithology: 'Песчаник', stratigraphy: 'K2', description: 'Однородный песчаник.', source: 'Керн' }

describe('lithology interval helpers', () => {
  it('splits an interval only at an inner boundary', () => {
    expect(splitLithologyInterval(interval, 200)).toEqual([
      expect.objectContaining({ from: 120, to: 200 }),
      expect.objectContaining({ from: 200, to: 280 }),
    ])
    expect(splitLithologyInterval(interval, 120)).toBeUndefined()
  })

  it('merges only adjacent intervals', () => {
    expect(mergeLithologyIntervals(interval, { ...interval, id: 'L-02', from: 280, to: 320 })).toEqual(expect.objectContaining({ from: 120, to: 320 }))
    expect(mergeLithologyIntervals(interval, { ...interval, id: 'L-03', from: 281, to: 320 })).toBeUndefined()
  })
})
