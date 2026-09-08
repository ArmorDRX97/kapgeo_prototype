import { describe, expect, it } from 'vitest'
import { validateBgdWellSectionSearch } from './bgdWellSection'

describe('validateBgdWellSectionSearch', () => {
  it('accepts the logging section and other well sections', () => {
    expect(validateBgdWellSectionSearch({ tab: 'logs' })).toEqual({ tab: 'logs' })
    expect(validateBgdWellSectionSearch({ tab: 'drilling' })).toEqual({ tab: 'drilling' })
  })

  it('uses description as the default section', () => {
    expect(validateBgdWellSectionSearch({ tab: 'description' })).toEqual({ tab: undefined })
    expect(validateBgdWellSectionSearch({ tab: 'unknown' })).toEqual({ tab: undefined })
  })
})
