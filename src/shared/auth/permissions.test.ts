import { describe, expect, it } from 'vitest'
import { defaultPersona, userPersonas } from '../../entities/session/model/personas'
import { getPermissions, hasPermission } from './permissions'

describe('BGD permission model', () => {
  it('grants the fixed geologist profile the BGD workbench permissions', () => {
    expect(hasPermission(defaultPersona, 'bgd.view')).toBe(true)
    expect(hasPermission(defaultPersona, 'geology.view')).toBe(true)
    expect(hasPermission(defaultPersona, 'geology.bgd.well.update-all')).toBe(true)
    expect(hasPermission(defaultPersona, 'geology.bgd.well.manage-core')).toBe(true)
    expect(hasPermission(defaultPersona, 'geology.bgd.well.manage-deviation')).toBe(true)
    expect(hasPermission(defaultPersona, 'geology.bgd.well.administer-deviation')).toBe(false)
    expect(getPermissions(defaultPersona).size).toBeGreaterThan(5)
  })

  it('restores all fourteen prototype roles and keeps deposit creation administrative', () => {
    expect(userPersonas).toHaveLength(14)
    expect(hasPermission(defaultPersona, 'geology.bgd.create')).toBe(false)
    const systemAdmin = userPersonas.find((persona) => persona.roles.includes('R13')) ?? null
    const aiAdmin = userPersonas.find((persona) => persona.roles.includes('R14')) ?? null
    expect(hasPermission(systemAdmin, 'geology.bgd.create')).toBe(true)
    expect(hasPermission(systemAdmin, 'administration.view')).toBe(true)
    expect(hasPermission(aiAdmin, 'administration.view')).toBe(true)
    expect(hasPermission(aiAdmin, 'geology.bgd.create')).toBe(false)
    expect(hasPermission(systemAdmin, 'geology.bgd.well.administer-deviation')).toBe(true)
  })

  it('varies module access by persona permissions', () => {
    const laboratory = userPersonas.find((persona) => persona.roles.includes('R8')) ?? null
    const analyst = userPersonas.find((persona) => persona.roles.includes('R11')) ?? null
    expect(hasPermission(laboratory, 'technology.view')).toBe(true)
    expect(hasPermission(laboratory, 'bgd.view')).toBe(false)
    expect(hasPermission(laboratory, 'geology.view')).toBe(false)
    expect(hasPermission(analyst, 'bgd.view')).toBe(true)
    expect(hasPermission(analyst, 'geology.view')).toBe(true)
    expect(hasPermission(analyst, 'analytics.view')).toBe(true)
  })
})
