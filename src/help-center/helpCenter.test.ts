import { describe, expect, it } from 'vitest'
import { flowGuides, verificationRecords } from './data/flows'
import { moduleGuides } from './data/modules'
import { roleGuides } from './data/roles'

describe('help center content', () => {
  it('contains a complete guide for every configured role', () => {
    expect(roleGuides).toHaveLength(14)
    expect(new Set(roleGuides.map((role) => role.id)).size).toBe(14)
    expect(roleGuides.every((role) => role.steps.length >= 3 && role.collaboratesWith.length >= 2)).toBe(true)
  })

  it('uses internal links for every documented action', () => {
    const links = [
      ...roleGuides.flatMap((role) => [role.startHref, ...role.steps.map((step) => step.href)]),
      ...moduleGuides.flatMap((module) => [module.entryHref, ...module.screens.map((screen) => screen.href)]),
      ...flowGuides.flatMap((flow) => flow.steps.map((step) => step.href)),
      ...verificationRecords.map((record) => record.href),
    ]
    expect(links.length).toBeGreaterThan(100)
    expect(links.every((href) => href.startsWith('/'))).toBe(true)
  })

  it('covers every major product module and cross-role flow', () => {
    expect(moduleGuides.map((module) => module.id)).toEqual(['common', 'geology', 'technology', 'modeling', 'analytics', 'admin'])
    expect(flowGuides).toHaveLength(4)
    expect(verificationRecords.length).toBeGreaterThanOrEqual(10)
  })
})
