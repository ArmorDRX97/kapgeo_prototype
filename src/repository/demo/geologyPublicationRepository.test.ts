import { afterEach, describe, expect, it } from 'vitest'
import { demoDatabase } from './demoDatabase'
import { DemoGeologyPublicationRepository } from './geologyPublicationRepository'

describe('DemoGeologyPublicationRepository', () => {
  afterEach(async () => { await demoDatabase.reset() })

  it('persists exact versions, consumer handoffs, withdrawal history and regression evidence', async () => {
    const repository = new DemoGeologyPublicationRepository()
    const initial = await repository.get()
    const createdAt = '2026-08-24T10:00:00.000Z'
    const published = await repository.save(initial, {
      ...initial,
      approval: { status: 'approved', reason: 'Synthetic approval', signaturePlaceholder: 'DEMO-SIGNATURE' },
      publication: { status: 'published' },
      handoffs: [{ id: 'HANDOFF-modeling-V1', consumer: 'modeling', packageId: initial.id, packageVersion: initial.version + 1, exactVersionIds: initial.selectedVersionIds, targetPath: '/modeling', status: 'available', createdAt }],
      regression: { ...initial.regression, status: 'passed', createdAt, steps: initial.regression.steps.map((step) => ({ ...step, status: 'passed' })) },
    }, 'publication.published')

    expect((await repository.listHandoffs('modeling'))[0]).toMatchObject({ packageId: initial.id, status: 'available' })
    expect((await demoDatabase.getAll<{ type: string }>('relations')).filter((item) => item.type === 'package-exact-version')).toHaveLength(5)
    expect((await repository.get()).regression.status).toBe('passed')

    const withdrawn = await repository.save(published, { ...published, publication: { status: 'withdrawn', reason: 'Synthetic replacement prepared' }, handoffs: published.handoffs.map((item) => ({ ...item, status: 'withdrawn' })) }, 'publication.withdrawn')
    expect(withdrawn.publication.status).toBe('withdrawn')
    expect((await demoDatabase.getAll<{ eventType: string }>('auditEvents')).some((item) => item.eventType === 'publication.withdrawn')).toBe(true)
  })

  it('rejects stale updates and global reset restores draft seed', async () => {
    const repository = new DemoGeologyPublicationRepository()
    const initial = await repository.get()
    await repository.save(initial, { ...initial, approval: { ...initial.approval, status: 'in_review' } }, 'publication.review.requested')
    await expect(repository.save(initial, initial, 'publication.stale')).rejects.toThrow('VERSION_CONFLICT')
    await demoDatabase.reset()
    expect(await repository.get()).toMatchObject({ version: 1, publication: { status: 'draft' }, handoffs: [] })
  })
  it('keeps export history downloadable and clears only user-created artifacts', async () => {
    const repository = new DemoGeologyPublicationRepository()
    const initial = await repository.get()
    const createdAt = '2026-08-24T11:00:00.000Z'
    const withExport = await repository.save(initial, { ...initial, exports: [{ id: 'EXPORT-json-V2', fileName: 'GEO-PKG-2026-08.json', format: 'json', artifactId: 'ART-USER-JSON', checksum: 'demo-checksum', userCreated: true, createdAt }] }, 'publication.export.created')

    expect((await demoDatabase.getAll<{ id: string }>('artifacts')).some((item) => item.id === 'ART-USER-JSON')).toBe(true)
    const cleared = await repository.clearUserArtifacts(withExport)
    expect(cleared.exports).toEqual([])
    expect((await demoDatabase.getAll<{ id: string }>('artifacts')).some((item) => item.id === 'ART-USER-JSON')).toBe(false)
  })})

