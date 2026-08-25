import { afterEach, describe, expect, it } from 'vitest'
import { demoDatabase } from './demoDatabase'
import { DemoGeologyMasterRepository } from './geologyMasterRepository'

describe('DemoGeologyMasterRepository', () => {
  afterEach(async () => { await demoDatabase.reset() })

  it('persists a newly created deposit and protects its immutable code', async () => {
    const repository = new DemoGeologyMasterRepository()
    const created = await repository.createDeposit({ code: 'DEMO-02', name: 'Демонстрационный объект', description: 'Synthetic fixture.', crs: 'EPSG:32642' })

    await expect(new DemoGeologyMasterRepository().getMasterData()).resolves.toMatchObject({ deposits: expect.arrayContaining([expect.objectContaining({ id: created.id, code: 'DEMO-02' })]) })
    await expect(repository.createDeposit({ code: 'DEMO-02', name: 'Дубликат', description: 'Synthetic fixture.', crs: 'EPSG:32642' })).rejects.toThrow('immutable code')
  })

  it('persists site and lens CRUD and prevents archival with active dependants', async () => {
    const repository = new DemoGeologyMasterRepository()
    const site = await repository.createSite({ depositId: 'DEP-SARYTAU', code: 'EAST', name: 'Восточный' })
    const lens = await repository.createLens({ siteId: site.id, code: 'E-01', name: 'Залежь E-01' })

    await expect(repository.archiveSite(site)).rejects.toThrow('DEPENDENCY_WARNING')
    const archivedLens = await repository.archiveLens(lens)
    const archivedSite = await repository.archiveSite({ ...site, version: site.version })

    expect(archivedLens.status).toBe('archived')
    expect(archivedSite.status).toBe('archived')
    expect((await repository.getMasterData()).sites).toEqual(expect.arrayContaining([expect.objectContaining({ id: site.id, status: 'archived' })]))
  })
  it('creates a new draft of published conditions, then approves and publishes it', async () => {
    const repository = new DemoGeologyMasterRepository()
    const published = (await repository.getMasterData()).conditionSets[0]!
    const draft = await repository.createConditionSetVersion(published)
    const saved = await repository.saveConditionSet(draft, { effectiveFrom: '2026-09-01', density: 2.72, balanceThreshold: 1.25, offBalanceThreshold: 0.65, azimuthCorrection: 0.1, geometryTolerance: 0.2 })
    const approved = await repository.approveConditionSet(saved)
    const republished = await repository.publishConditionSet(approved)

    expect(republished).toMatchObject({ status: 'published', version: approved.version + 1, density: 2.72 })
  })
})
