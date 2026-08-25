import { afterEach, describe, expect, it } from 'vitest'
import { demoDatabase } from './demoDatabase'
import { demoWellDataRepository } from './wellDataRepository'
import { DemoWellGeologyRepository } from './wellGeologyRepository'

describe('DemoWellGeologyRepository', () => {
  afterEach(async () => { await demoDatabase.reset() })

  it('persists tracks, linked samples and QA/QC evidence after reload', async () => {
    const repository = new DemoWellGeologyRepository()
    const well = await demoWellDataRepository.getWell('WELL-1042')
    const initial = await repository.get(well)
    const saved = await repository.save(well, initial, { ...initial, overrides: [{ id: 'OVR-1', trackId: initial.tracks[0]!.id, intervalId: initial.tracks[0]!.intervals[0]!.id, grouping: 'A', description: 'Synthetic override', inheritsSource: false, version: 1 }], samples: initial.samples.map((item) => ({ ...item, linkedIntervals: [initial.tracks[0]!.intervals[0]!.id], workflow: 'qa_accepted' })) }, 'geology.qa.accepted')

    expect((await repository.get(well)).version).toBe(saved.version)
    expect((await demoDatabase.getAll<{ entityType: string }>('records')).some((item) => item.entityType === 'geological-track')).toBe(true)
    expect((await demoDatabase.getAll<{ type: string }>('relations')).some((item) => item.type === 'sample-depth-link')).toBe(true)
    expect((await demoDatabase.getAll<{ id: string }>('auditEvents')).some((item) => item.id.includes('geology.qa.accepted'))).toBe(true)
  })

  it('stores batch label and LIMS reconciliation artifacts, then reset returns seeded data', async () => {
    const repository = new DemoWellGeologyRepository()
    const well = await demoWellDataRepository.getWell('WELL-1042')
    const initial = await repository.get(well)
    const sample = { ...initial.samples[0]!, id: 'SMP-BATCH-1', number: 'SYN-BATCH-1', linkedIntervals: [initial.tracks[0]!.intervals[0]!.id] }
    const batched = await repository.save(well, initial, { ...initial, samples: [...initial.samples, sample] }, 'geology.batch.created')
    expect((await demoDatabase.getAll<{ kind: string }>('artifacts')).some((item) => item.kind === 'sample-labels')).toBe(true)

    const reconciled = await repository.save(well, batched, { ...batched, lims: [{ id: 'LIMS-1', sampleId: sample.id, result: batched.labResults[0]!, state: 'applied' }] }, 'geology.lims.reconciled')
    expect((await demoDatabase.getAll<{ kind: string }>('jobs')).some((item) => item.kind === 'lims-reconciliation')).toBe(true)
    await demoDatabase.reset()
    expect((await repository.get(well)).version).toBe(1)
    expect(reconciled.version).toBeGreaterThan(batched.version)
  })
  it('does not overwrite a stale geological draft', async () => {
    const repository = new DemoWellGeologyRepository()
    const well = await demoWellDataRepository.getWell('WELL-1042')
    const current = await repository.get(well)
    const saved = await repository.save(well, current, { ...current, dictionaries: current.dictionaries.map((item) => ({ ...item, version: 2 })) }, 'geology.dictionary.saved')
    await expect(repository.save(well, current, saved, 'geology.dictionary.saved')).rejects.toThrow('VERSION_CONFLICT')
  })
})
