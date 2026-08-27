import { afterEach, describe, expect, it } from 'vitest'
import { demoDatabase, wellRecord } from './demoDatabase'
import { DemoWellDataRepository } from './wellDataRepository'
import { getSeedWells } from '../data/wells'
import { getTechnicalData } from '../data/wellTechnical'
import { getSamples } from '../data/wellSamples'
import { getWellLogs } from '../data/wellLogs'
import { getGeologyData } from '../data/wellGeology'

describe('DemoWellDataRepository full well fixture', () => {
  afterEach(async () => { await demoDatabase.reset() })

  it('provides a fully completed BGD well after reset', async () => {
    const repository = new DemoWellDataRepository()
    const well = await repository.getWell('WELL-1010-FULL')

    expect(well.bgd).toMatchObject({
      depositId: 'DEP-SARYTAU',
      lensId: 'LENS-PR07',
      profileId: 'PR-07',
      geoBlockId: 'BLK-07-12',
      techBlockId: 'TC-07-12',
    })
    expect(well.bgd?.drilling.intervals).toHaveLength(3)
    expect(well.bgd?.development.works).toHaveLength(3)
    expect(well.bgd?.geology.impermeableIntervals).toHaveLength(3)
    expect(Object.values(well.bgd?.passport ?? {}).every(Boolean)).toBe(true)
    expect(well.site).toBe('Северный')
    expect(getTechnicalData(well)).toMatchObject({
      construction: expect.arrayContaining([expect.objectContaining({ element: 'Фильтровая колонна' })]),
      drillingRuns: expect.arrayContaining([expect.objectContaining({ method: 'Колонковое' })]),
      coreBoxes: expect.arrayContaining([expect.objectContaining({ number: 'BX-118' })]),
    })
    expect(getSamples(well).length).toBeGreaterThan(0)
    expect(getWellLogs(well.id).length).toBeGreaterThan(0)
    expect(getGeologyData(well).intervals).toHaveLength(5)
  })

  it('backfills an existing legacy full-well record without requiring reset', async () => {
    const legacy = getSeedWells().find((item) => item.id === 'WELL-1010-FULL')!
    delete legacy.bgd
    await demoDatabase.put('records', wellRecord(legacy))

    const repository = new DemoWellDataRepository()
    const listed = await repository.listWells()
    const migrated = listed.find((item) => item.id === 'WELL-1010-FULL')
    const stored = await repository.getWell('WELL-1010-FULL')

    expect(migrated?.bgd?.descriptionRu).toContain('полностью документированная')
    expect(stored.bgd?.drilling.intervals).toHaveLength(3)
  })
})
