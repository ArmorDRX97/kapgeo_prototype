import { describe, expect, it } from 'vitest'
import { validateLabResults } from './validateLabResults'

describe('validateLabResults', () => {
  it('rejects incompatible unit and impossible pH', () => {
    expect(validateLabResults([{ id: 'R-1', sampleId: 'S-1', analyte: 'pH', value: 15, unit: 'мг/кг', method: 'M', analyst: 'A', qaStatus: 'На проверке' }])).toHaveLength(1)
  })
})
