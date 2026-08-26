import { beforeEach, describe, expect, it } from 'vitest'
import type { UpdateDepositPatch } from '../../entities/geology-master/model/types'
import { DemoDatabase, type DemoRecord } from './demoDatabase'
import { DemoGeologyMasterRepository } from './geologyMasterRepository'

describe('DemoGeologyMasterRepository BGD CRUD', () => {
  const database = new DemoDatabase('test-geology-master-bgd')
  const repository = new DemoGeologyMasterRepository(database)

  beforeEach(async () => {
    await database.reset()
  })

  it('seeds deterministic multilingual fields with a single numeric code', async () => {
    const data = await repository.getMasterData()
    const sarytau = data.deposits.find((item) => item.code === 1)

    expect(data.deposits).toHaveLength(3)
    expect(sarytau).toMatchObject({ code: 1, nameRu: 'Сарытау', nameKk: 'Сарытау', nameEn: 'Sarytau', objectType: 'field', isHidden: false })
    expect(data.deposits.find((item) => item.code === 4)?.isHidden).toBe(true)
    expect(sarytau?.occurrences).toHaveLength(2)
  })

  it('creates, updates, hides and deletes an independent field', async () => {
    const created = await repository.createDeposit({
      code: 77,
      objectType: 'custom',
      customType: 'Лицензионная территория',
      nameRu: 'Тестовое 77',
      nameKk: 'Сынақ 77',
      nameEn: 'Test 77',
      coordinateSystem: 'Локальная система 77',
      descriptionRu: 'Описание.',
      descriptionKk: 'Сипаттама.',
      descriptionEn: 'Description.',
      isHidden: false,
      occurrences: [],
    })

    expect(created).toMatchObject({ code: 77, version: 1, objectType: 'custom', isHidden: false })

    const patch: UpdateDepositPatch = {
      nameRu: 'Тестовое 77 · скрыто',
      nameKk: created.nameKk,
      nameEn: created.nameEn,
      objectType: 'field',
      customType: undefined,
      coordinateSystem: created.coordinateSystem,
      descriptionRu: created.descriptionRu,
      descriptionKk: created.descriptionKk,
      descriptionEn: created.descriptionEn,
      isHidden: true,
      occurrences: created.occurrences,
    }
    const updated = await repository.updateDeposit(created, patch)
    expect(updated).toMatchObject({ version: 2, objectType: 'field', isHidden: true, nameRu: 'Тестовое 77 · скрыто' })

    await repository.deleteDeposit(updated)
    expect((await repository.getMasterData()).deposits.some((item) => item.id === created.id)).toBe(false)
  })

  it('rejects a duplicate immutable numeric code', async () => {
    await repository.getMasterData()
    await expect(repository.createDeposit({ code: 1, nameRu: 'Другое', nameKk: 'Басқа', nameEn: 'Other' }))
      .rejects.toThrow('кодом')
  })

  it('migrates legacy IndexedDB records without losing their identifier', async () => {
    const legacyRecord: DemoRecord<Record<string, unknown>> = {
      id: 'deposit:DEP-LEGACY',
      entityType: 'deposit',
      objectId: 'DEP-LEGACY',
      scopeId: 'DEP-LEGACY',
      status: 'active',
      updatedAt: '2026-08-24T00:00:00.000Z',
      data: { id: 'DEP-LEGACY', numericId: 91, code: 'LEGACY', name: 'Старое месторождение', description: 'Старое описание', crs: 'EPSG:32642', version: 3, status: 'active' },
    }
    await database.put('records', legacyRecord)

    const migrated = (await repository.getMasterData()).deposits[0]!
    expect(migrated).toMatchObject({ id: 'DEP-LEGACY', code: 91, nameRu: 'Старое месторождение', nameKk: 'Старое месторождение', nameEn: 'Старое месторождение', version: 3 })
    const stored = await database.get<DemoRecord<Record<string, unknown>>>('records', 'deposit:DEP-LEGACY')
    expect(stored?.data).toMatchObject({ code: 91, nameRu: 'Старое месторождение' })
  })

  it('blocks deletion when hierarchy or embedded occurrences exist', async () => {
    const data = await repository.getMasterData()
    const sarytau = data.deposits.find((item) => item.code === 1)!

    await expect(repository.deleteDeposit(sarytau)).rejects.toThrow('DEPENDENCY_WARNING')
  })

  it('records a view audit event once per user within a minute', async () => {
    await repository.getMasterData()
    await repository.recordDepositViewed('DEP-SARYTAU', { id: 'geo.ivanova', name: 'Ирина Иванова' })
    await repository.recordDepositViewed('DEP-SARYTAU', { id: 'geo.ivanova', name: 'Ирина Иванова' })

    const events = await database.getAll<{ eventType: string; entityId: string; actor: { id: string } }>('auditEvents')
    expect(events.filter((event) => event.eventType === 'deposit.viewed' && event.entityId === 'DEP-SARYTAU' && event.actor.id === 'geo.ivanova')).toHaveLength(1)
  })
})
