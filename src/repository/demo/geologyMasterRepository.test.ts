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
    const limits = data.conditionSets.find((item) => item.id === 'CONDITIONS-DEP-SARYTAU')?.limits
    expect(limits).toHaveLength(28)
    expect(limits).toContainEqual(expect.objectContaining({ id: 'uranium-cutoff', value: '0.012', unit: 'м%' }))
  })

  it('adds the full condition-limits list to legacy stored condition sets', async () => {
    await repository.getMasterData()
    const stored = await database.get<DemoRecord<Record<string, unknown>>>('records', 'condition-set:CONDITIONS-DEP-SARYTAU')
    delete (stored!.data as { limits?: unknown }).limits
    await database.put('records', stored!)

    const migrated = (await repository.getMasterData()).conditionSets.find((item) => item.id === 'CONDITIONS-DEP-SARYTAU')
    expect(migrated?.limits).toHaveLength(28)
    expect(migrated?.limits?.find((item) => item.id === 'rock-density')?.value).toBe('1730')
  })

  it('migrates site sets into one deposit set, keeps edited values and backs up the sources', async () => {
    await repository.getMasterData()
    await database.transaction(['records'], (transaction) => transaction.delete('records', 'condition-set:CONDITIONS-DEP-SARYTAU'))
    const legacy = (id: string, siteId: string, value: string, updatedAt: string) => ({
      id: `condition-set:${id}`, entityType: 'condition-set', objectId: id, scopeId: 'DEP-SARYTAU', status: 'published', updatedAt,
      data: { id, siteId, version: 3, status: 'published', density: 2.71, limits: [
        { id: 'uranium-cutoff', parameter: 'Бортовое содержание урана', value },
        { id: 'permafrost-boundary', parameter: 'Граница вечной мерзлоты', value: 'Не задана' },
      ] },
    })
    await database.put('records', legacy('OLD-NORTH', 'SITE-NORTH', '0.03', '2026-10-08'))
    await database.put('records', legacy('OLD-CENTRAL', 'SITE-CENTRAL', '0.04', '2026-10-09'))
    const migrated = (await repository.getMasterData()).conditionSets
    expect(migrated).toHaveLength(1)
    expect(migrated[0]).toMatchObject({ id: 'CONDITIONS-DEP-SARYTAU', depositId: 'DEP-SARYTAU' })
    expect(migrated[0]!.limits).toHaveLength(28)
    expect(migrated[0]!.limits.find((item) => item.id === 'uranium-cutoff')?.value).toBe('0.04')
    expect(migrated[0]!.limits.some((item) => item.id === 'permafrost-boundary')).toBe(false)
    expect(migrated[0]).not.toHaveProperty('siteId')
    expect(await database.get('meta', 'legacy-condition-set:condition-set:OLD-NORTH')).toBeDefined()
    expect(await database.get('meta', 'legacy-condition-set:condition-set:OLD-CENTRAL')).toBeDefined()
    expect((await new DemoGeologyMasterRepository(database).getMasterData()).conditionSets).toEqual(migrated)
  })

  it('saves deposit limits directly, repeatedly and without versions, including a deposit without sites', async () => {
    const original = (await repository.getMasterData()).conditionSets[0]!
    const limits = original.limits.map((item) => item.id === 'uranium-cutoff' ? { ...item, value: '0.05' } : item)
    const saved = await repository.saveConditionSet({ ...original, limits })
    expect(saved).not.toHaveProperty('version')
    expect(saved).not.toHaveProperty('status')
    await repository.saveConditionSet({ ...saved, limits: saved.limits.map((item) => item.id === 'uranium-cutoff' ? { ...item, value: '0.06' } : item) })
    await repository.saveConditionSet({ ...saved, depositId: 'DEP-SEVERNOE' })
    const reloaded = await new DemoGeologyMasterRepository(database).getMasterData()
    expect(reloaded.conditionSets.filter((item) => item.depositId === 'DEP-SARYTAU')).toHaveLength(1)
    expect(reloaded.conditionSets.find((item) => item.depositId === 'DEP-SARYTAU')?.limits.find((item) => item.id === 'uranium-cutoff')?.value).toBe('0.06')
    expect(reloaded.conditionSets.filter((item) => item.depositId === 'DEP-SEVERNOE')).toHaveLength(1)
    const versions = await database.getAll<{ id: string }>('versions')
    expect(versions.some((item) => item.id.includes('condition-set'))).toBe(false)
    await expect(repository.saveConditionSet({ ...saved, depositId: 'UNKNOWN' })).rejects.toThrow('Месторождение не найдено')
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

    expect(created).toMatchObject({ code: 77, objectType: 'custom', isHidden: false })

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
    expect(updated).toMatchObject({ objectType: 'field', isHidden: true, nameRu: 'Тестовое 77 · скрыто' })

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
    expect(migrated).toMatchObject({ id: 'DEP-LEGACY', code: 91, nameRu: 'Старое месторождение', nameKk: 'Старое месторождение', nameEn: 'Старое месторождение' })
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

  it('consolidates legacy site lenses without duplicates and preserves references used by wells', async () => {
    const data = await repository.getMasterData()
    expect(data.lenses).toEqual([])
    const deposit = data.deposits.find((item) => item.id === 'DEP-SARYTAU')!
    expect(deposit.occurrences).toHaveLength(2)
    expect(deposit.occurrences.find((item) => item.nameRu === 'PR-07')?.legacyIds).toContain('LENS-PR07')
    expect(await database.get('meta', 'legacy-lens:lens:LENS-PR07')).toBeDefined()
    await database.put('records', { id: 'lens:EXTRA', entityType: 'lens', objectId: 'EXTRA', scopeId: deposit.id, status: 'active', updatedAt: '2026-10-09',
      data: { id: 'EXTRA', siteId: 'SITE-NORTH', code: 'EXTRA', name: 'Дополнительная залежь', version: 1, status: 'active' } })
    const migrated = await repository.getMasterData()
    expect(migrated.deposits.find((item) => item.id === deposit.id)?.occurrences).toContainEqual(expect.objectContaining({ id: 'EXTRA', nameRu: 'Дополнительная залежь' }))
    await repository.deleteSite(migrated.sites.find((item) => item.id === 'SITE-NORTH')!)
    expect((await repository.getMasterData()).deposits.find((item) => item.id === deposit.id)?.occurrences).toHaveLength(3)
    await expect(repository.deleteOccurrence(deposit, deposit.occurrences.find((item) => item.nameRu === 'PR-07')!.id)).rejects.toThrow('используется скважинами')
  })

  it('supports independent site CRUD, unique codes per deposit without record versions', async () => {
    await repository.getMasterData()
    const site = await repository.createSite({ depositId: 'DEP-SARYTAU', code: 'SOUTH', name: 'Южный' })
    const other = await repository.createSite({ depositId: 'DEP-SEVERNOE', code: 'SOUTH', name: 'Другой' })
    expect(other.id).not.toBe(site.id)
    const updated = await repository.updateSite(site, { name: 'Южный изменённый' })
    expect(updated).not.toHaveProperty('version')
    expect(await repository.updateSite(site, { name: 'Новое название' })).toMatchObject({ name: 'Новое название' })
    await expect(repository.updateSite(updated, { name: '  ' })).rejects.toThrow('наименование')
    await repository.deleteSite(updated)
    const reloaded = await repository.getMasterData()
    expect(reloaded.sites.some((item) => item.id === site.id)).toBe(false)
    expect(reloaded.sites.some((item) => item.id === other.id)).toBe(true)
  })

  it('validates occurrence CRUD and preserves the list when updating only deposit details', async () => {
    const deposit = (await repository.getMasterData()).deposits.find((item) => item.id === 'DEP-SEVERNOE')!
    const saved = await repository.saveOccurrence(deposit, { type: 'Рудная залежь', nameRu: 'Новая', nameKk: 'Жаңа', nameEn: 'New' })
    const occurrence = saved.occurrences[0]!
    expect(saved).not.toHaveProperty('version')
    const edited = await repository.saveOccurrence(saved, { ...occurrence, nameEn: 'Edited' })
    await expect(repository.saveOccurrence(edited, { type: 'Рудная залежь', nameRu: 'Новая', nameKk: 'Жаңа', nameEn: 'New' })).rejects.toThrow('дубликат')
    const details: UpdateDepositPatch = { ...edited }
    delete details.occurrences
    const updated = await repository.updateDeposit(edited, { ...details, descriptionEn: 'Updated' })
    expect(updated.occurrences[0]?.nameEn).toBe('Edited')
    const deleted = await repository.deleteOccurrence(updated, occurrence.id)
    expect(deleted.occurrences).toEqual([])
    await expect(repository.deleteOccurrence(deleted, occurrence.id)).rejects.toThrow('не найдена')
  })
})
