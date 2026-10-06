import { describe, expect, it } from 'vitest'
import { validateBgdWellSectionSearch } from './bgdWellSection'

describe('validateBgdWellSectionSearch', () => {
  it('accepts the logging section and other well sections', () => {
    expect(validateBgdWellSectionSearch({ tab: 'logs' })).toEqual({ tab: 'logs' })
    expect(validateBgdWellSectionSearch({ tab: 'drilling' })).toEqual({ tab: 'drilling' })
    expect(validateBgdWellSectionSearch({ tab: 'deviation' })).toEqual({ tab: 'deviation' })
    expect(validateBgdWellSectionSearch({ tab: 'core-runs' })).toEqual({ tab: 'core-runs' })
    expect(validateBgdWellSectionSearch({ tab: 'core-samples' })).toEqual({ tab: 'core-samples' })
    expect(validateBgdWellSectionSearch({ tab: 'lithology' })).toEqual({ tab: 'lithology' })
    expect(validateBgdWellSectionSearch({ tab: 'ore-intervals' })).toEqual({ tab: 'ore-intervals' })
  })

  it('uses description as the default section', () => {
    expect(validateBgdWellSectionSearch({ tab: 'description' })).toEqual({ tab: undefined })
    expect(validateBgdWellSectionSearch({ tab: 'unknown' })).toEqual({ tab: undefined })
  })

  it('restores real passport sections and only keeps views owned by the section', () => {
    expect(validateBgdWellSectionSearch({ tab: 'passport' })).toEqual({ tab: 'passport' })
    expect(validateBgdWellSectionSearch({ tab: 'geometry' })).toEqual({ tab: 'geometry' })
    expect(validateBgdWellSectionSearch({ tab: 'documentation' })).toEqual({ tab: 'documentation' })
    expect(validateBgdWellSectionSearch({ tab: 'core-runs', view: 'measurements' })).toEqual({ tab: 'core-runs', view: 'measurements' })
    expect(validateBgdWellSectionSearch({ tab: 'lithology', view: 'composite' })).toEqual({ tab: 'lithology', view: 'composite' })
    expect(validateBgdWellSectionSearch({ tab: 'description', view: 'notes' })).toEqual({ tab: undefined, view: 'notes' })
    expect(validateBgdWellSectionSearch({ tab: 'logs', view: 'notes' })).toEqual({ tab: 'logs' })
    expect(validateBgdWellSectionSearch({ tab: 'lithology', view: 'core' })).toEqual({ tab: 'lithology' })
  })
})
