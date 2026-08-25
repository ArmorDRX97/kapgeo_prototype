import { describe, expect, it } from 'vitest'
import { DemoDatabase, type DemoRecord } from './demoDatabase'

describe('DemoDatabase', () => {
  it('seeds the deterministic world, persists a record and restores seed on reset', async () => {
    const database = new DemoDatabase('kapgeo-demo-test-persistence')
    await database.initialize()

    const wells = await database.getAll<DemoRecord>('records')
    expect(wells.filter((record) => record.entityType === 'well')).toHaveLength(11)

    await database.put('preferences', {
      id: 'preference:workspace',
      entityType: 'workspace-layout',
      objectId: 'geology',
      scopeId: 'demo',
      status: 'active',
      updatedAt: '2026-08-24T10:00:00.000Z',
      data: { density: 'compact' },
    })
    const reopened = new DemoDatabase('kapgeo-demo-test-persistence')
    expect(await reopened.get('preferences', 'preference:workspace')).toBeDefined()

    await database.reset()
    expect(await database.get('preferences', 'preference:workspace')).toBeUndefined()
    expect((await database.getAll<DemoRecord>('records')).filter((record) => record.entityType === 'well')).toHaveLength(11)
  })
})
