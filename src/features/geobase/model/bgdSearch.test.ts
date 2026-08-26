import { describe, expect, it } from 'vitest'
import { validateBgdSearch } from './bgdSearch'

describe('validateBgdSearch', () => {
  it('keeps valid shareable BGD context', () => {
    expect(validateBgdSearch({ q: 'Сарытау', type: 'field', visibility: 'hidden', sort: 'code', direction: 'desc', page: '2', pageSize: '20' })).toEqual({
      q: 'Сарытау',
      type: 'field',
      visibility: 'hidden',
      sort: 'code',
      direction: 'desc',
      page: 2,
      pageSize: 20,
    })
  })

  it('drops invalid filters', () => {
    expect(validateBgdSearch({ q: '  ', type: 'mine', visibility: 'deleted', sort: 'created', direction: 'up', page: 0, pageSize: 13 })).toEqual({
      q: undefined,
      type: undefined,
      visibility: undefined,
      sort: undefined,
      direction: undefined,
      page: undefined,
      pageSize: undefined,
    })
  })
})
