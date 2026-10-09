import { describe, expect, it } from 'vitest'
import { DemoDatabase, type DemoRecord } from './demoDatabase'

describe('BGD current data migration', () => {
  it('preserves edited values, removes nested version fields and BGD snapshots, and retains independent reference data', async () => {
    const database = new DemoDatabase('bgd-current-data-migration')
    await database.reset()
    const snapshot = await database.exportSnapshot()
    snapshot.stores.records.push({ id: 'well-core:TEST', entityType: 'well-core-workspace', objectId: 'TEST', scopeId: 'TEST', status: 'draft', updatedAt: '2026-10-09', data: { wellId: 'TEST', version: 4, runs: [{ id: 'RUN-1', recoveredLength: 3.14, version: 2 }] } })
    snapshot.stores.versions.push({ id: 'WELL-CORE-TEST-V4', objectId: 'well-core:TEST', version: 4 }, { id: 'REFERENCE-1-V2', objectId: 'reference:1', version: 2 })
    await database.importSnapshot(snapshot)
    expect((await database.get<DemoRecord>('records', 'well-core:TEST'))?.data).toEqual({ wellId: 'TEST', runs: [{ id: 'RUN-1', recoveredLength: 3.14 }] })
    expect(await database.getAll('versions')).toEqual([{ id: 'REFERENCE-1-V2', objectId: 'reference:1', version: 2 }])
  })
})
