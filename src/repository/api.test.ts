import { afterEach, describe, expect, it } from 'vitest'
import { createWell, fetchWell, fetchWellPassportHistory, fetchWellPassportWorkspace, saveWellPassport } from './api'
import { demoWellPassportRepository } from './demo/wellPassportRepository'

describe('repository compatibility API snapshots', () => {
  afterEach(() => demoWellPassportRepository.reset())

  it('returns version history after creating a new passport version', async () => {
    const workspace = await fetchWellPassportWorkspace('WELL-1010-FULL')
    const result = await saveWellPassport({
      wellId: 'WELL-1010-FULL',
      passport: { ...workspace.passport.data, purpose: 'Наблюдательная' },
      construction: workspace.construction.data,
      expectedPassportVersion: workspace.passport.version,
      expectedConstructionVersion: workspace.construction.version,
      idempotencyKey: 'API-HISTORY-001',
      reason: 'Проверка фиксации истории',
    })

    const history = await fetchWellPassportHistory('WELL-1010-FULL')

    expect(result.auditEvents).toHaveLength(1)
    expect(history.passport).toHaveLength(2)
    expect(history.passport[0]).toMatchObject({ version: 12, status: 'published' })
    expect(history.passport[1]).toMatchObject({ version: 13, status: 'in_review', reason: 'Проверка фиксации истории' })
    expect(history.construction).toHaveLength(1)
  })

  it('does not mutate a previously fetched well snapshot when a new version is saved', async () => {
    const before = await fetchWell('WELL-1010-FULL')
    const workspace = await fetchWellPassportWorkspace('WELL-1010-FULL')

    await saveWellPassport({
      wellId: 'WELL-1010-FULL',
      passport: { ...workspace.passport.data, purpose: 'Наблюдательная' },
      construction: workspace.construction.data,
      expectedPassportVersion: workspace.passport.version,
      expectedConstructionVersion: workspace.construction.version,
      idempotencyKey: 'API-SNAPSHOT-001',
    })
    const after = await fetchWell('WELL-1010-FULL')

    expect(before.version).toBe(12)
    expect(before.purpose).toBe('Разведочная')
    expect(after.version).toBe(13)
    expect(after.purpose).toBe('Наблюдательная')
  })

  it('validates legacy create-well coordinates through the geometry boundary', async () => {
    await expect(createWell({
      code: 'WELL-GEOMETRY-INVALID',
      type: 'Разведочная',
      purpose: 'Разведочная',
      site: 'Северный',
      profile: 'PR-07',
      coordinates: { x: Number.NaN, y: 4_812_900 },
      crs: 'EPSG:32642',
      depth: 500,
      casingDiameter: 168,
    })).rejects.toThrow('Координаты устья не прошли проверку')
  })
})
