import { afterEach, describe, expect, it } from 'vitest'
import { demoDatabase } from './demoDatabase'
import { demoWellDataRepository } from './wellDataRepository'
import { DemoWellLogRepository } from './wellLogRepository'

describe('DemoWellLogRepository', () => {
  afterEach(async () => { await demoDatabase.reset() })

  it('persists fixture, QC mapping and applied LogRun after reload', async () => {
    const repository = new DemoWellLogRepository()
    const well = await demoWellDataRepository.getWell('WELL-1042')
    const initial = await repository.get(well)
    const staged = await repository.beginImport(well, initial, 'bundled fixture')
    const qcReady = await repository.save(well, staged, { ...staged, staging: { ...staged.staging!, state: 'qc_ready' } }, 'log.mapping.qc.confirmed')
    const applied = await repository.applyImport(well, qcReady)
    expect((await repository.get(well)).runs).toHaveLength(initial.runs.length + 1)
    expect(applied.runs.at(-1)?.survey).toMatchObject({ instrument: 'Цифровая каротажная станция', isPrimary: false })
    expect((await demoDatabase.getAll<{ entityType: string }>('records')).some((item) => item.entityType === 'log-run')).toBe(true)
    expect((await demoDatabase.getAll<{ kind: string }>('artifacts')).some((item) => item.kind === 'raw-log-file')).toBe(true)
    expect(applied.version).toBeGreaterThan(initial.version)
  })

  it('keeps derived lineage and rejects stale workspace writes', async () => {
    const repository = new DemoWellLogRepository()
    const well = await demoWellDataRepository.getWell('WELL-1042')
    const current = await repository.get(well)
    const base = current.runs[0]!.curves[0]!
    const saved = await repository.save(well, current, { ...current, runs: current.runs.map((run) => ({ ...run, curves: [...run.curves, { id: 'CURVE-DERIVED-T', code: 'GR_DERIVED', label: 'Derived', unit: 'API', scale: 'linear', color: '#000', version: 1, sourceCurveIds: [base.id], formula: 'Synthetic' }] })) }, 'log.transform.created')
    expect((await demoDatabase.getAll<{ type: string }>('relations')).some((item) => item.type === 'derived-from')).toBe(true)
    await expect(repository.save(well, current, saved, 'log.viewer.saved')).rejects.toThrow('VERSION_CONFLICT')
  })
})
