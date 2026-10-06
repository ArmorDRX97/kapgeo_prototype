import { afterEach, describe, expect, it } from 'vitest'
import { defaultPersona, userPersonas } from '../../entities/session/model/personas'
import { referenceDefinitions } from '../../entities/reference-data/model/catalog'
import { demoDatabase, type DemoRecord } from './demoDatabase'
import type { ReferenceWorkspace } from '../../entities/reference-data/model/types'
import { ReferenceDataRepository } from './referenceDataRepository'
import { demoWellDeviationRepository } from './wellDeviationRepository'
import { primaryWell } from '../data/wells'
import { validateReferenceValues } from '../../entities/reference-data/lib/validation'

const admin = userPersonas.find((persona) => persona.id === 'admin.system')!
const reader = userPersonas.find((persona) => persona.id === 'admin.ai')!
const repository = new ReferenceDataRepository()
const names = { code: 'TEST', name_ru: 'Тест', name_kk: 'Тест', name_en: 'Test' }

describe('ReferenceDataRepository', () => {
  afterEach(async () => { await demoDatabase.reset() })

  it('updates legacy default labels without clearing stored records, user edits or references', async () => {
    await repository.get()
    const key = 'reference-data:standalone-workspace'
    const stored = (await demoDatabase.get<DemoRecord<ReferenceWorkspace>>('records', key))!
    const entry = stored.data.entries.find(item => item.id === 'REF-DEPOSIT-1')!
    entry.values = { code: 'DEMO-1', name_ru: 'Типы месторождений · демо 1', name_kk: 'Демо жазба 1', name_en: 'Custom translated name' }
    await demoDatabase.put('records', stored)
    const shown = await repository.get()
    expect(shown.version).toBe(stored.data.version)
    expect(shown.entries.map(item => item.id)).toEqual(stored.data.entries.map(item => item.id))
    expect(shown.entries.find(item => item.id === entry.id)?.values).toEqual({ code: 'REF-1', name_ru: 'Типы месторождений · 1', name_kk: 'Жазба 1', name_en: 'Custom translated name' })
    expect(shown.entries.find(item => item.dictionaryId === 'reff_device')?.values).toEqual(stored.data.entries.find(item => item.dictionaryId === 'reff_device')?.values)
    expect((await demoDatabase.get<DemoRecord<ReferenceWorkspace>>('records', key))?.data).toEqual(stored.data)
    await expect(repository.execute({ operation: 'created', dictionaryId: 'deposit_type', values: { ...names, code: 'ref-1' }, expectedVersion: shown.version }, admin)).rejects.toThrow()
  })

  it('persists CRUD, immutable schema, prior values and the actual actor in audit', async () => {
    let current = await repository.get()
    const schema = structuredClone(referenceDefinitions)
    current = await repository.execute({ operation: 'created', dictionaryId: 'fault_type', values: names, expectedVersion: current.version }, admin)
    const entry = current.changes.at(-1)!.after!
    current = await repository.execute({ operation: 'updated', dictionaryId: 'fault_type', entryId: entry.id, values: { ...names, name_ru: 'Новое имя' }, expectedVersion: current.version }, admin)
    expect((await repository.get()).entries.find((item) => item.id === entry.id)?.values.name_ru).toBe('Новое имя')
    expect(current.changes.at(-1)?.before?.values.name_ru).toBe('Тест')
    current = await repository.execute({ operation: 'deleted', dictionaryId: 'fault_type', entryId: entry.id, expectedVersion: current.version }, admin)
    expect(current.entries.some((item) => item.id === entry.id)).toBe(false)
    expect(referenceDefinitions).toEqual(schema)
    const events = await demoDatabase.getAll<{ actor: { id: string }; eventType: string }>('auditEvents')
    expect(events.find((item) => item.eventType === 'reference.deleted')?.actor.id).toBe(admin.id)
  })

  it('rejects duplicate codes, missing translations, extra attributes and wrong typed values', async () => {
    const current = await repository.get()
    for (const [dictionaryId, values] of [['deposit_type', { ...names, code: String(current.entries.find((entry) => entry.dictionaryId === 'deposit_type')!.values.code).toLowerCase() }], ['fault_type', { code: 'X', name_ru: 'Тест' }], ['fault_type', { ...names, extra: 'value' }], ['reff_coordinate_system', { code: 'CS', name: 'Demo', epsg_code: 1.5, transform_params: 'broken JSON' }]] as const) {
      await expect(repository.execute({ operation: 'created', dictionaryId, values, expectedVersion: current.version }, admin)).rejects.toThrow()
    }
    expect((await repository.get()).version).toBe(current.version)
  })

  it('blocks deletion of referenced rows, permits deactivation and keeps existing references', async () => {
    let current = await repository.get()
    await expect(repository.execute({ operation: 'deleted', dictionaryId: 'device_type', entryId: 'REF-DEVICE-TYPE-1', expectedVersion: current.version }, admin)).rejects.toThrow('используется')
    current = await repository.execute({ operation: 'deactivated', dictionaryId: 'device_type', entryId: 'REF-DEVICE-TYPE-1', expectedVersion: current.version }, admin)
    expect(current.entries.find((entry) => entry.id === 'REF-DEVICE-TYPE-1')?.active).toBe(false)
    expect(current.entries.find((entry) => entry.id === 'REF-DEVICE-1')?.values.device_type_id).toBe('REF-DEVICE-TYPE-1')
    const existing = current.entries.find((entry) => entry.id === 'REF-DEVICE-1')!
    current = await repository.execute({ operation: 'updated', dictionaryId: 'reff_device', entryId: existing.id, values: existing.values, expectedVersion: current.version }, admin)
    await expect(repository.execute({ operation: 'created', dictionaryId: 'reff_device', values: existing.values, expectedVersion: current.version }, admin)).rejects.toThrow('действующую')
  })

  it('checks mutation permissions and detects version conflicts', async () => {
    const current = await repository.get()
    for (const persona of [defaultPersona, reader, null]) await expect(repository.execute({ operation: 'created', dictionaryId: 'fault_type', values: names, expectedVersion: current.version }, persona)).rejects.toThrow('прав')
    await repository.execute({ operation: 'created', dictionaryId: 'fault_type', values: names, expectedVersion: current.version }, admin)
    await expect(repository.execute({ operation: 'created', dictionaryId: 'fault_type', values: { ...names, code: 'OTHER' }, expectedVersion: current.version }, admin)).rejects.toThrow('другой вкладке')
  })

  it('is independent from existing BGD data and permits deleting an unreferenced demo device', async () => {
    const before = await demoWellDeviationRepository.get(primaryWell)
    let current = await repository.get()
    const device = current.entries.find((entry) => entry.id === 'REF-DEVICE-1')!
    current = await repository.execute({ operation: 'updated', dictionaryId: 'reff_device', entryId: device.id, values: { ...device.values, name_ru: 'Переименованный прибор' }, expectedVersion: current.version }, admin)
    current = await repository.execute({ operation: 'deleted', dictionaryId: 'reff_device', entryId: device.id, expectedVersion: current.version }, admin)
    expect(current.entries.some((entry) => entry.id === device.id)).toBe(false)
    expect(await demoWellDeviationRepository.get(primaryWell)).toEqual(before)
  })

  it('populates every fixed dictionary with valid deterministic fake values and internal links', async () => {
    const first = await repository.get()
    for (const definition of referenceDefinitions) {
      const entries = first.entries.filter((entry) => entry.dictionaryId === definition.id)
      expect(entries).toHaveLength(3)
      expect(entries.some((entry) => !entry.active)).toBe(true)
      for (const entry of entries) expect(validateReferenceValues(definition.id, entry.values, first, entry.id)).toEqual({})
    }
    await demoDatabase.reset()
    expect(await repository.get()).toEqual(first)
  })
})
