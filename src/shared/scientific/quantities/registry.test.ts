import { describe, expect, it } from 'vitest'
import { convertQuantity, formatMeasuredValue, toCanonicalValue, validateMeasuredValue } from './registry'

const source = { id: 'SRC-SYNTHETIC', label: 'Синтетический лабораторный результат' }

describe('quantity registry', () => {
  it('converts compatible length and concentration units', () => {
    expect(convertQuantity(1.25, 'м', 'мм')).toBe(1_250)
    expect(convertQuantity(0.01, '%', 'мг/кг')).toBe(100)
    expect(toCanonicalValue({ quantityId: 'bulk_density', value: 1.7, unitId: 'т/м³', source })).toBe(1_700)
  })

  it('rejects incompatible units and scientific ranges', () => {
    expect(validateMeasuredValue({ quantityId: 'ph', value: 15, unitId: 'pH', source })).toEqual([
      expect.objectContaining({ code: 'outside-range' }),
    ])
    expect(validateMeasuredValue({ quantityId: 'ph', value: 7, unitId: 'мг/кг', source })).toEqual([
      expect.objectContaining({ code: 'incompatible-unit' }),
    ])
  })

  it('requires an explicit reason for missing values and supports qualifiers', () => {
    expect(validateMeasuredValue({ quantityId: 'mass_concentration', unitId: 'мг/кг', source })).toEqual([
      expect.objectContaining({ code: 'missing-reason' }),
    ])
    const belowDetection = { quantityId: 'mass_concentration' as const, value: 0.05, unitId: 'мг/кг' as const, qualifier: 'lt' as const, source }
    expect(validateMeasuredValue(belowDetection)).toEqual([])
    expect(formatMeasuredValue(belowDetection)).toBe('< 0,05 мг/кг')
  })
})
