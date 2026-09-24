import { afterEach, describe, expect, it } from 'vitest'
import { primaryWell } from '../data/wells'
import { demoDatabase } from './demoDatabase'
import { DemoWellDeviationRepository } from './wellDeviationRepository'

describe('DemoWellDeviationRepository', () => {
  afterEach(async () => { await demoDatabase.reset() })

  it('persists surveys, points, relations, version and audit evidence', async () => {
    const repository = new DemoWellDeviationRepository()
    const current = await repository.get(primaryWell)
    const saved = await repository.save(primaryWell, current, { ...current, surveys: current.surveys.map((item, index) => ({ ...item, isPrimary: index === 1 })) }, 'deviation.primary.selected')
    expect(saved.version).toBe(2)
    expect(saved.surveys[1]?.isPrimary).toBe(true)
    expect((await demoDatabase.getAll<{ entityType: string }>('records')).some((item) => item.entityType === 'deviation-point')).toBe(true)
    expect((await demoDatabase.getAll<{ type: string }>('relations')).some((item) => item.type === 'deviation-of')).toBe(true)
    expect((await demoDatabase.getAll<{ eventType: string }>('auditEvents')).some((item) => item.eventType === 'deviation.primary.selected')).toBe(true)
    const storedWell = await demoDatabase.get<{ data: typeof primaryWell }>('records', `well:${primaryWell.id}`)
    expect(storedWell?.data.bgd?.geometry.bottomOffsetLength).toBe(saved.surveys[1]?.planDistance)
    expect((await demoDatabase.getAll<{ eventType: string }>('auditEvents')).some((item) => item.eventType === 'well.geometry.updated-from-deviation')).toBe(true)
  })

  it('rejects more than one primary survey', async () => {
    const repository = new DemoWellDeviationRepository()
    const current = await repository.get(primaryWell)
    await expect(repository.save(primaryWell, current, { ...current, surveys: current.surveys.map((item) => ({ ...item, isPrimary: true })) }, 'deviation.updated')).rejects.toThrow('только один')
  })

  it('deletes the selected survey description, points, relations and records an audit event', async () => {
    const repository = new DemoWellDeviationRepository()
    const current = await repository.get(primaryWell)
    const removed = current.surveys[0]!
    const saved = await repository.save(primaryWell, current, { ...current, surveys: current.surveys.filter((item) => item.id !== removed.id) }, 'deviation.survey.deleted')

    expect(saved.surveys.some((item) => item.id === removed.id)).toBe(false)
    expect(await demoDatabase.get('records', `deviation-survey:${removed.id}`)).toBeUndefined()
    for (const point of removed.points) expect(await demoDatabase.get('records', `deviation-point:${point.id}`)).toBeUndefined()
    expect(await demoDatabase.get('relations', `REL-DEVIATION-WELL-${removed.id}`)).toBeUndefined()
    expect((await demoDatabase.getAll<{ eventType: string }>('auditEvents')).some((item) => item.eventType === 'deviation.survey.deleted')).toBe(true)
  })
})
