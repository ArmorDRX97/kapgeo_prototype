import { afterEach, describe, expect, it } from 'vitest'
import { demoDatabase } from './demoDatabase'
import { DemoWellDataRepository } from './wellDataRepository'
import { DemoWellMasterRepository } from './wellMasterRepository'

describe('DemoWellMasterRepository', () => {
  afterEach(async () => { await demoDatabase.reset() })

  it('persists independent passport aggregate versions and the review workflow', async () => {
    const wells = new DemoWellDataRepository()
    const repository = new DemoWellMasterRepository()
    const well = await wells.getWell('WELL-1010-FULL')
    const initial = await repository.getWorkspace(well)
    const draft = await repository.createDraft(well, initial)
    const saved = await repository.saveAggregate(well, draft, 'description', { shortName: 'WELL-1010', purposeNote: 'Уточнённое synthetic назначение', contractor: 'ТОО «KAPGEO Synthetic»' })
    const submitted = await repository.transitionWorkflow(well, saved, 'submit')
    const approved = await repository.transitionWorkflow(well, submitted, 'approve')
    const published = await repository.transitionWorkflow(well, approved, 'publish')

    expect(saved.aggregates.description.version).toBe(draft.aggregates.description.version + 1)
    expect(saved.aggregates.documentation.version).toBe(draft.aggregates.documentation.version)
    expect(published.workflow.status).toBe('published')
    await expect(repository.saveAggregate(well, published, 'geology', { groundwater: 'Synthetic', permafrost: 'Нет', complications: 'Нет' })).rejects.toThrow('READ_ONLY')
  })
})
