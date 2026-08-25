import { describe, expect, it } from 'vitest'
import { validateBgdSearch } from './bgdSearch'

describe('validateBgdSearch', () => {
  it('keeps valid shareable BGD context', () => {
    expect(validateBgdSearch({ q: 'Сарытау', type: 'field', visibility: 'hidden' })).toEqual({
      q: 'Сарытау',
      type: 'field',
      visibility: 'hidden',
    })
  })

  it('drops invalid filters', () => {
    expect(validateBgdSearch({ q: '  ', type: 'mine', visibility: 'deleted' })).toEqual({
      q: undefined,
      type: undefined,
      visibility: undefined,
    })
  })
})