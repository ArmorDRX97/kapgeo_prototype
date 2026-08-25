import { afterEach, describe, expect, it } from 'vitest'
import { demoDatabase } from './demoDatabase'
import { DemoPreferencesRepository } from './demoPreferencesRepository'

describe('DemoPreferencesRepository', () => {
  afterEach(async () => { await demoDatabase.reset() })

  it('persists the geology map workspace layout and reset restores deterministic defaults', async () => {
    const repository = new DemoPreferencesRepository()

    expect(await repository.getGeologyMapWorkspace()).toMatchObject({ labels: true, contours: true, quality: false })
    await repository.saveGeologyMapWorkspace({ labels: false, contours: true, quality: true })

    expect(await repository.getGeologyMapWorkspace()).toMatchObject({ labels: false, contours: true, quality: true })
    await demoDatabase.reset()
    expect(await repository.getGeologyMapWorkspace()).toMatchObject({ labels: true, contours: true, quality: false })
  })
  it('persists the well registry grouping and saved views', async () => {
    const repository = new DemoPreferencesRepository()
    await repository.saveWellRegistry({ grouping: 'status', savedViews: [{ id: 'critical', label: 'Критичные', search: { status: 'Требует внимания' } }] })

    expect(await repository.getWellRegistry()).toMatchObject({ grouping: 'status', savedViews: [{ id: 'critical' }] })
    await demoDatabase.reset()
    expect(await repository.getWellRegistry()).toMatchObject({ grouping: 'site' })
  })
  it('persists locale, accessibility and browser QA preferences', async () => {
    const repository = new DemoPreferencesRepository()
    const initial = await repository.getPlatform()
    await repository.savePlatform({ ...initial, locale: 'kk', contrast: true, reducedMotion: true, performanceProfile: 'large', browserWidths: [390, 1440], helpSeen: true })

    expect(await repository.getPlatform()).toMatchObject({ locale: 'kk', contrast: true, reducedMotion: true, performanceProfile: 'large', browserWidths: [390, 1440] })
    await demoDatabase.reset()
    expect(await repository.getPlatform()).toMatchObject({ locale: 'ru', contrast: false, browserWidths: [] })
  })})

