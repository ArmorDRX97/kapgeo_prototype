import { describe, expect, it } from 'vitest'
import { initialSections } from '../../../entities/geology-section/model/fixtures'
import { profileLength } from '../../../entities/geology-section/lib/profile'
import { plotHeaders } from './plotHeaders'

describe('horizontal well legends', () => {
  for (const width of [364, 1000, 1400]) it(`fits cards without overlap in ${width}px and keeps the full track labels`, () => {
    const section = initialSections()[0]!, layout = plotHeaders(section, width, 0, profileLength(section.profile))
    expect(layout.cards).toHaveLength(5)
    for (const [i, card] of layout.cards.entries()) {
      expect(card.x).toBeGreaterThanOrEqual(42)
      expect(card.x + card.width).toBeLessThanOrEqual(width - 42)
      expect(card.y + card.height).toBeLessThan(layout.top)
      expect(card.tracks.map(t => t.lines.join(' '))).toEqual(['Литология', 'КС', 'ГК', 'Интервалы'])
      for (const other of layout.cards.slice(i + 1)) expect(card.x + card.width <= other.x || other.x + other.width <= card.x || card.y + card.height <= other.y || other.y + other.height <= card.y).toBe(true)
    }
  })
  it('wraps twelve repeated tracks into rows and reserves their complete height', () => {
    const section = initialSections()[0]!, id = section.wellIds[0]!
    section.columnSettings = { [id]: { width: 12, offset: 0, curves: true, intervals: true, lithology: true, curveMin: 0, curveMax: 80, tracks: Array.from({ length: 12 }, (_, i) => ({ id: `curve-${i}`, type: 'curve', curveId: 'rs', width: 12 })) } }
    const layout = plotHeaders(section, 364, 0, profileLength(section.profile)), card = layout.cards.find(c => c.id === id)!
    expect(card.tracks).toHaveLength(12)
    expect(card.tracks.every(t => t.name === 'КС')).toBe(true)
    expect(new Set(card.tracks.map(t => t.y)).size).toBeGreaterThan(1)
    expect(card.y + card.height).toBeLessThan(layout.top)
  })
})
