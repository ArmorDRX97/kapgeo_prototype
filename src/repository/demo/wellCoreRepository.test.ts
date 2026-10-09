import { beforeEach, describe, expect, it } from 'vitest'
import { getSeedWells } from '../data/wells'
import { DemoDatabase } from './demoDatabase'
import { DemoWellCoreRepository } from './wellCoreRepository'

describe('DemoWellCoreRepository', () => {
  const database = new DemoDatabase('kapgeo-test-well-core')
  const repository = new DemoWellCoreRepository(database)
  const well = getSeedWells()[0]!

  beforeEach(async () => database.reset())

  it('persists runs, samples and audit evidence', async () => {
    const current = await repository.get(well)
    const saved = await repository.save(well, current, { ...current, runs: current.runs.slice(1) }, 'core.run.deleted')
    expect((await repository.get(well)).runs).toHaveLength(saved.runs.length)
    expect((await database.getAll<{ eventType: string }>('auditEvents')).some((item) => item.eventType === 'core.run.deleted')).toBe(true)
  })

  it('saves current data repeatedly without record versions', async () => {
    const current = await repository.get(well)
    await repository.save(well, current, current, 'core.saved')
    const saved = await repository.save(well, current, { ...current, runs: current.runs.slice(1) }, 'core.saved')
    expect(saved).not.toHaveProperty('version')
    expect((await repository.get(well)).runs).toHaveLength(1)
    expect(await database.getAll('versions')).toEqual([])
  })
})
