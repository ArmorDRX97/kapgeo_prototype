import { describe, expect, it } from 'vitest'
import { initialSections } from '../../../entities/geology-section/model/fixtures'
import { profileLength } from '../../../entities/geology-section/lib/profile'
import { plotHeaders } from './plotHeaders'

describe('horizontal well names', () => {
  for (const width of [364, 1000, 1400]) it(`fits compact well names without overlap in ${width}px`, () => {
    const section = initialSections()[0]!, layout = plotHeaders(section, width, 0, profileLength(section.profile))
    expect(layout.cards).toHaveLength(5)
    for (const [i, card] of layout.cards.entries()) {
      expect(card.x).toBeGreaterThanOrEqual(42)
      expect(card.x + card.width).toBeLessThanOrEqual(width - 42)
      expect(card.y + card.height).toBeLessThan(layout.top)
      expect(card.name).toMatch(/^ГС-10[1-5]$/)
      expect(card.height).toBe(32)
      for (const other of layout.cards.slice(i + 1)) expect(card.x + card.width <= other.x || other.x + other.width <= card.x || card.y + card.height <= other.y || other.y + other.height <= card.y).toBe(true)
    }
  })
  it('keeps the header compact with twelve tracks while preserving the column bracket', () => {
    const section = initialSections()[0]!, id = section.wellIds[0]!
    section.columnSettings = { [id]: { width: 12, offset: 0, curves: true, intervals: true, lithology: true, curveMin: 0, curveMax: 80, tracks: Array.from({ length: 12 }, (_, i) => ({ id: `curve-${i}`, type: 'curve', curveId: 'rs', width: 12 })) } }
    const layout = plotHeaders(section, 364, 0, profileLength(section.profile)), card = layout.cards.find(c => c.id === id)!
    expect(card.height).toBe(32)
    expect(card.to - card.from).toBeCloseTo(12 * 12 + 11 * 5)
    expect(card.y + card.height).toBeLessThan(layout.top)
  })
  it('returns more height to the graph when all five names fit in one row', () => {
    const section = initialSections()[0]!, layout = plotHeaders(section, 1000, 0, profileLength(section.profile))
    expect(layout.top).toBe(64)
    expect(new Set(layout.cards.map(card => card.y)).size).toBe(1)
  })
})
