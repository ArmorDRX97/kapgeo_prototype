import { describe, expect, it } from 'vitest'
import { defaultPersona } from '../../entities/session/model/personas'
import { getPermissions, hasPermission } from './permissions'

describe('BGD permission model', () => {
  it('grants the fixed geologist profile the BGD workbench permissions', () => {
    expect(hasPermission(defaultPersona, 'geology.view')).toBe(true)
    expect(hasPermission(defaultPersona, 'geology.bgd.well.update-all')).toBe(true)
    expect(hasPermission(defaultPersona, 'geology.bgd.well.manage-core')).toBe(true)
    expect(getPermissions(defaultPersona).size).toBeGreaterThan(5)
  })
})
