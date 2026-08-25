import { describe, expect, it } from 'vitest'
import { validateLabResults } from './validateLabResults'

describe('validateLabResults', () => {
  it('rejects incompatible unit and impossible pH', () => {
    expect(validateLabResults([{ id: 'R-1', sampleId: 'S-1', analyte: 'pH', value: 15, unit: 'мг/кг', method: 'M', analyst: 'A', qaStatus: 'На проверке' }])).toHaveLength(1)
  })

  it('accepts convertible concentration units and qualified values', () => {
    expect(validateLabResults([{ id: 'R-2', sampleId: 'S-1', analyte: 'U', value: 0.01, unit: '%', qualifier: 'approx', method: 'M', analyst: 'A', qaStatus: 'На проверке' }])).toEqual([])
  })

  it('requires a reason when a value is missing', () => {
    expect(validateLabResults([{ id: 'R-3', sampleId: 'S-1', analyte: 'Mo', unit: 'мг/кг', method: 'M', analyst: 'A', qaStatus: 'На проверке' }])).toEqual([
      expect.objectContaining({ resultId: 'R-3', message: expect.stringContaining('причину') }),
    ])
  })
})
