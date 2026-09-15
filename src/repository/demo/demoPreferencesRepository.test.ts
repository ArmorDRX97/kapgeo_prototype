import { afterEach, describe, expect, it } from 'vitest'
import { demoDatabase } from './demoDatabase'
import { DemoPreferencesRepository } from './demoPreferencesRepository'

describe('DemoPreferencesRepository', () => {
  afterEach(async () => { await demoDatabase.reset() })

  it('persists BGD locale, accessibility and current deposit preferences', async () => {
    const repository = new DemoPreferencesRepository()
    const initial = await repository.getPlatform()
    expect(initial).toMatchObject({ locale: 'ru', contrast: false, currentDepositId: 'DEP-SARYTAU' })

    await repository.savePlatform({ locale: 'kk', density: 'compact', contrast: true, reducedMotion: true, currentDepositId: 'DEP-SEVERNOE' })
    expect(await repository.getPlatform()).toMatchObject({ locale: 'kk', density: 'compact', contrast: true, reducedMotion: true, currentDepositId: 'DEP-SEVERNOE' })

    await demoDatabase.reset()
    expect(await repository.getPlatform()).toMatchObject({ locale: 'ru', contrast: false, currentDepositId: 'DEP-SARYTAU' })
  })
})
