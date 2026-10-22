import { expect, it } from 'vitest'
import { corridorPath } from './corridor'

it('draws a distance envelope with the requested radius on both sides and rounded ends', () => {
  expect(corridorPath({ x: 0, y: 0 }, { x: 100, y: 0 }, 20)).toBe('M0,20L100,20A20,20 0 0 0 100,-20L0,-20A20,20 0 0 0 0,20Z')
  expect(corridorPath({ x: 0, y: 0 }, { x: 0, y: 100 }, 20)).toContain('M-20,0L-20,100')
  expect(corridorPath({ x: 0, y: 0 }, { x: 0, y: 0 }, 20)).not.toMatch(/NaN|Infinity/)
  expect(corridorPath({ x: 0, y: 0 }, { x: 100, y: 0 }, 0)).toBe('')
})
