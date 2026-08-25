import { afterEach, describe, expect, it } from 'vitest'
import { demoDatabase } from './demoDatabase'
import { demoWellDataRepository } from './wellDataRepository'
import { DemoWellTrajectoryRepository } from './wellTrajectoryRepository'

describe('DemoWellTrajectoryRepository', () => {
  afterEach(async () => { await demoDatabase.reset() })

  it('persists an imported survey and changes the selected synthetic bottom', async () => {
    const repository = new DemoWellTrajectoryRepository()
    const well = await demoWellDataRepository.getWell('WELL-1042')
    const initial = await repository.get(well)
    const imported = await repository.importFixture(well, initial)
    const local = imported.surveys.find((item) => item.source === 'local demo fixture')
    expect(local).toBeDefined()
    const selected = await repository.selectSurvey(well, imported, local!.id)
    expect(selected.selectedSurveyId).toBe(local!.id)
    expect(selected.activeResult.surveyId).toBe(local!.id)
    expect((await repository.get(well)).version).toBe(selected.version)
    expect((await demoDatabase.getAll<{ kind: string }>('jobs')).some((job) => job.kind === 'trajectory-calculation')).toBe(true)
    expect((await demoDatabase.getAll<{ kind: string }>('artifacts')).some((artifact) => artifact.kind === 'import-protocol')).toBe(true)
    expect((await demoDatabase.getAll<{ entityType: string }>('records')).some((record) => record.entityType === 'core-run')).toBe(true)
  })

  it('rejects saving a stale core draft instead of overwriting it', async () => {
    const repository = new DemoWellTrajectoryRepository()
    const well = await demoWellDataRepository.getWell('WELL-1042')
    const current = await repository.get(well)
    const saved = await repository.save(well, current, { ...current, coreRuns: current.coreRuns.map((item) => ({ ...item, recovered: item.recovered + 1 })) }, 'trajectory.core.saved')
    await expect(repository.save(well, current, saved, 'trajectory.core.saved')).rejects.toThrow('VERSION_CONFLICT')
  })
})
