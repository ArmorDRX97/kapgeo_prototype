import { afterEach, describe, expect, it } from 'vitest'
import { createPermeabilityExample, firstPermeabilityGap, loadPermeabilityIntervals, permeabilityCsv, permeabilityStorageKey, permeabilityTotals, validatePermeabilityIntervals } from './bgdWellPermeability'

afterEach(() => localStorage.clear())
describe('dedicated permeability intervals', () => {
  it('uses rock intervals independent of legacy AP-shaped records', () => {
    localStorage.setItem('kapgeo.interval-review.v1.permeability.W1', JSON.stringify([{ id: 'AP-1', from: 300, to: 320, horizon: 'K2', uranium: .1 }]))
    const rows = loadPermeabilityIntervals('W1', 500)
    expect(rows).toHaveLength(7)
    expect(rows[0]!.from).toBe(0)
    expect(rows.at(-1)!.to).toBe(500)
    expect(rows[0]).not.toHaveProperty('horizon')
    expect(rows[0]).not.toHaveProperty('uranium')
    expect(validatePermeabilityIntervals(rows, 500)).toBe('')
    const totals = permeabilityTotals(rows, 500)
    expect(totals.undescribed).toBe(0)
    expect(totals.groups.unknown.thickness).toBe(60)
    expect(totals.groups.permeable.count).toBe(3)
  })
  it('preserves unknown measurements, validates overlap and finds unrecorded depths', () => {
    const rows = createPermeabilityExample(500)
    expect(rows[0]!.kind).toBe('impermeable')
    expect(rows[0]!.kf).toBeNull()
    expect(validatePermeabilityIntervals([{ ...rows[0]!, to: 101 }, ...rows.slice(1)], 500)).toMatch(/перекрываются/)
    expect(validatePermeabilityIntervals([{ ...rows[0]!, kf: -1 }], 500)).toMatch(/Кф/)
    expect(firstPermeabilityGap(rows.slice(1), 500)).toEqual({ from: 0, to: 100 })
    localStorage.setItem(permeabilityStorageKey('W1'), JSON.stringify(rows))
    expect(loadPermeabilityIntervals('W1', 500)).toEqual(rows)
  })
  it('exports only the requested rows and leaves missing values blank', () => {
    const rows = createPermeabilityExample(500).filter(r => r.kind === 'unknown')
    const csv = permeabilityCsv(rows)
    expect(csv.split('\r\n')).toHaveLength(2)
    expect(csv).toContain('Нет данных')
    expect(csv).not.toContain('Непроницаемые')
    expect(csv).toContain('"";""')
    expect(csv).not.toContain('Крр')
  })
})
