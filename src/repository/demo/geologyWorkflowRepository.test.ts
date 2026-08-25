import { afterEach, describe, expect, it } from 'vitest'
import { demoDatabase } from './demoDatabase'
import { DemoGeologyWorkflowRepository } from './geologyWorkflowRepository'

describe('DemoGeologyWorkflowRepository', () => {
  afterEach(async () => demoDatabase.reset())

  it('persists an expert interpretation decision and its review transition', async () => {
    const repository = new DemoGeologyWorkflowRepository()
    const initial = await repository.getInterpretation('INT-TEST')
    const saved = await repository.saveInterpretation('INT-TEST', initial, 'corrected', 'Граница уточнена по совокупности кривых.')
    const reloaded = await new DemoGeologyWorkflowRepository().getInterpretation('INT-TEST')
    const submitted = await repository.submitInterpretation('INT-TEST', reloaded)
    const approved = await repository.approveInterpretation('INT-TEST', submitted)

    expect(reloaded).toMatchObject({ resolution: 'corrected', status: 'draft' })
    expect(submitted).toMatchObject({ status: 'in_review', revision: saved.revision + 1 })
    expect(approved).toMatchObject({ status: 'approved', revision: submitted.revision + 1 })
  })

  it('rejects a mutation of a published delivery version', async () => {
    const repository = new DemoGeologyWorkflowRepository()
    const draft = await repository.getDelivery()
    const published = await repository.saveDelivery('GEO-PR07-2026-08', draft, { selected: draft.selected, published: true })

    await expect(repository.saveDelivery('GEO-PR07-2026-08', published, { selected: [], published: false })).rejects.toThrow('PUBLISHED_IMMUTABLE')
  })
})