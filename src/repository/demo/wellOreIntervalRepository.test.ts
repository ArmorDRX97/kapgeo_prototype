import { afterEach, describe, expect, it } from 'vitest'
import { primaryWell } from '../data/wells'
import { demoDatabase } from './demoDatabase'
import { DemoWellOreIntervalRepository } from './wellOreIntervalRepository'

describe('DemoWellOreIntervalRepository', () => {
  afterEach(async () => { await demoDatabase.reset() })

  it('persists the workspace, version, relations and audit evidence', async () => {
    const repository = new DemoWellOreIntervalRepository()
    const current = await repository.get(primaryWell)
    const saved = await repository.save(primaryWell, current, { ...current, useDifferentialLogging: true }, 'ore.updated')
    expect(saved.version).toBe(2)
    expect((await repository.get(primaryWell)).useDifferentialLogging).toBe(true)
    expect((await demoDatabase.getAll<{ type: string }>('relations')).some((item) => item.type === 'merged-ore-contains')).toBe(true)
    expect((await demoDatabase.getAll<{ eventType: string }>('auditEvents')).some((item) => item.eventType === 'ore.updated')).toBe(true)
  })
})
