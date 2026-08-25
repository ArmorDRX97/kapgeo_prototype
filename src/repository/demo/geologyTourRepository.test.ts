import { afterEach, describe, expect, it } from 'vitest'
import { demoDatabase } from './demoDatabase'
import { DemoGeologyTourRepository } from './geologyTourRepository'

describe('DemoGeologyTourRepository', () => {
  afterEach(async () => demoDatabase.reset())

  it('persists a persona-specific resumable tour and completion history', async () => {
    const repository = new DemoGeologyTourRepository()
    const initial = await repository.get('geo.ivanova')
    const saved = await repository.save('geo.ivanova', {
      ...initial,
      activeTourId: 'geology-well',
      stepIndex: 7,
      lastRoute: '/objects/wells/WELL-1042?tab=lithology',
      completedTourIds: ['geology-start', 'geology-start'],
      launcherSeen: true,
    })

    expect(saved.activeTourId).toBe('geology-well')
    expect(saved.stepIndex).toBe(7)
    expect(saved.completedTourIds).toEqual(['geology-start'])
    expect(await repository.get('geo.ivanova')).toEqual(saved)
    expect((await repository.get('gis.askarov')).activeTourId).toBeUndefined()
  })

  it('is cleared by the global IndexedDB reset', async () => {
    const repository = new DemoGeologyTourRepository()
    const initial = await repository.get('geo.ivanova')
    await repository.save('geo.ivanova', { ...initial, activeTourId: 'geology-complete', stepIndex: 12, launcherSeen: true })
    await demoDatabase.reset()
    const reset = await repository.get('geo.ivanova')
    expect(reset.activeTourId).toBeUndefined()
    expect(reset.stepIndex).toBe(0)
    expect(reset.launcherSeen).toBe(false)
  })
})
