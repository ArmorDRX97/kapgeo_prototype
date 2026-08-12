import { describe, expect, it } from 'vitest'
import { userPersonas } from '../../entities/session/model/personas'
import type { RoleId } from '../../entities/session/model/types'
import { getPermissions, hasPermission } from './permissions'

describe('permission model', () => {
  it('does not grant administration to a geophysicist', () => {
    const persona = userPersonas.find((item) => item.id === 'gis.askarov') ?? null
    expect(hasPermission(persona, 'geology.view')).toBe(true)
    expect(hasPermission(persona, 'administration.view')).toBe(false)
  })

  it('deduplicates permissions for multi-role personas', () => {
    const persona = {
      ...userPersonas[0]!,
      roles: ['R1', 'R11'] as RoleId[],
    }
    expect(getPermissions(persona).size).toBeGreaterThan(3)
  })
})
