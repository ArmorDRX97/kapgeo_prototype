import { describe, expect, it } from 'vitest'
import { validateDepositSectionSearch } from './depositSection'

describe('validateDepositSectionSearch', () => {
  it('accepts every supported deposit section', () => {
    for (const section of ['overview', 'relations', 'conditions', 'wells', 'edit', 'audit']) {
      expect(validateDepositSectionSearch({ section })).toEqual({ section })
    }
  })

  it('falls back to the overview for an unknown section', () => {
    expect(validateDepositSectionSearch({ section: 'unknown' })).toEqual({ section: undefined })
  })
  it('preserves a selected well in the map link', () => {
    expect(validateDepositSectionSearch({ well: 'BGD-field-well-1' })).toEqual({ section: undefined, well: 'BGD-field-well-1' })
  })
})
