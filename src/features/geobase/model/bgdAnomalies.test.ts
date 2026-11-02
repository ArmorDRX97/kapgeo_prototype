import { afterEach, describe, expect, it } from 'vitest'
import { createAnomalyRows, loadAnomalyRows, validateAnomalyRows } from './bgdAnomalies'

afterEach(() => localStorage.clear())
describe('AP local data', () => {
  it('keeps legacy intervals and characteristics while adding the two-level screen data', () => {
    const legacy = { id: 'old-ap', from: 100, to: 120, horizon: 'Сохранённый горизонт', source: 'ГИК', permeable: false, kf: .5, lft: 2, krr: 1.1, uranium: .07 }
    localStorage.setItem('ap', JSON.stringify([legacy]))
    const [row] = loadAnomalyRows('ap', 500)
    expect(row).toMatchObject(legacy)
    expect(row?.horizons[0]).toMatchObject({ from: 100, to: 120, horizon: legacy.horizon, values: { kf: .5 } })
    expect(row?.parameters.boreholeDiameter).toBe(136)
  })
  it('retains an intentionally empty list and checks crossing and horizon bounds', () => {
    localStorage.setItem('ap', '[]')
    expect(loadAnomalyRows('ap', 500)).toEqual([])
    const rows = createAnomalyRows(500)
    rows[0]!.horizons[0]!.to = rows[0]!.to + 1
    expect(validateAnomalyRows(rows, 500)).toContain('внутри')
    rows[0]!.horizons = []
    rows[1]!.from = rows[0]!.from
    expect(validateAnomalyRows(rows, 500)).toContain('перекрываются')
  })
})
