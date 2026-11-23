import { afterEach, describe, expect, it } from 'vitest'
import { exportReference, readReferencePackage } from '../../entities/reference-data/lib/exchange'
import { referenceDefinition } from '../../entities/reference-data/model/catalog'
import { userPersonas } from '../../entities/session/model/personas'
import { demoDatabase } from './demoDatabase'
import { referenceDataRepository } from './referenceDataRepository'
import { importReferences } from './referenceExchange'

const admin = userPersonas.find(persona => persona.id === 'admin.system')!
const reader = userPersonas.find(persona => persona.id === 'admin.ai')!
const now = new Date('2026-11-23T11:00:00Z')

function file(name: string, data: string | Uint8Array) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : Uint8Array.from(data)
  const result = new File([bytes], name)
  Object.defineProperty(result, 'arrayBuffer', { value: async () => bytes.buffer })
  return result
}

describe('reference exchange', () => {
  afterEach(async () => { await demoDatabase.reset() })

  it('exports and parses XML, JSON and CSV with the same codes, periods and attribute values', async () => {
    const workspace = await referenceDataRepository.get()
    const definition = referenceDefinition('reff_rock_type')!
    for (const format of ['xml', 'json', 'csv'] as const) {
      const exported = exportReference(workspace, definition, format, admin.name, now)
      expect(exported.name).toBe(`nsi_reff_rock_type_20261123_1100.${format}`)
      const parsed = await readReferencePackage(file(exported.name, exported.text))
      expect(parsed.referenceItems).toHaveLength(3)
      expect(parsed.referenceItems[1]?.values).toMatchObject({
        reference_type_code: 'reff_rock_type', code: '2', name: 'Песок мелкозернистый',
        'attr.parent': '1', 'attr.st_nak_number': '01.02', color_code: 'SAND', status: 'ACTIVE', valid_from: '2026-01-01',
      })
      expect(parsed.colors).toHaveLength(format === 'csv' ? 0 : 2)
    }
  })

  it('resolves a forward parent and color, skips existing codes, and persists its result', async () => {
    const data = {
      colors: [{ code: 'NEW-BLUE', name: 'Стальной синий', hex: '#2233aa' }],
      referenceItems: [
        { reference_type_code: 'reff_rock_type', code: '9', name: 'Новый литотип', attributes: { parent: '10', st_nak_number: '09.10' }, color_code: 'NEW-BLUE' },
        { reference_type_code: 'reff_rock_type', code: '10', name: 'Новая группа', attributes: { is_group: true } },
        { reference_type_code: 'reff_rock_type', code: '2', name: 'Пропустить обновление' },
      ],
    }
    const output = await importReferences(file('package.json', JSON.stringify(data)), undefined, admin)
    expect(output.result).toEqual({ rows: [{ dictionary: 'colors', added: 1, skipped: 0 }, { dictionary: 'reff_rock_type', added: 2, skipped: 1 }], errors: [] })
    const saved = await referenceDataRepository.get()
    expect(saved.lastImport?.result).toEqual(output.result)
    const group = saved.entries.find(entry => entry.values.name_ru === 'Новая группа')!
    const color = saved.colors?.find(item => item.code === 'NEW-BLUE')
    expect(color?.hex).toBe('#2233AA')
    expect(saved.entries.find(entry => entry.values.name_ru === 'Новый литотип')?.values).toMatchObject({ parent_id: group.id, color_id: color?.id })
    expect(saved.entries.some(entry => entry.values.name_ru === 'Пропустить обновление')).toBe(false)
  })

  it('rolls back the entire import for a hierarchy cycle', async () => {
    const initial = await referenceDataRepository.get()
    const data = {
      colors: [{ code: 'ROLLBACK', name: 'Rollback', hex: '#123456' }],
      referenceItems: [
        { reference_type_code: 'deposit_type', code: 'VALID', name: 'Допустимая запись' },
        { reference_type_code: 'reff_rock_type', code: '9', name: 'Ярус 1', attributes: { parent: '10' } },
        { reference_type_code: 'reff_rock_type', code: '10', name: 'Ярус 2', attributes: { parent: '9' } },
      ],
    }
    const { result } = await importReferences(file('package.json', JSON.stringify(data)), undefined, admin)
    expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'NSI_IMP_PARENT_CYCLE', location: 'referenceItems[1]' })]))
    const saved = await referenceDataRepository.get()
    expect(saved.entries).toEqual(initial.entries)
    expect(saved.colors).toEqual(initial.colors)
    expect(saved.changes).toEqual(initial.changes)
  })

  it('imports multiple CSV files from one ZIP and resolves their color codes', async () => {
    // An uncompressed ZIP with deposit_type.csv and colors.csv, including their CRCs.
    const zip = 'UEsDBBQAAAAAAH2Bd11gA/5wMQAAADEAAAAQAAAAZGVwb3NpdF90eXBlLmNzdmNvZGU7bmFtZTtjb2xvcl9jb2RlClpJUC0xO0EgemlwcGVkIHJvdztCTFVFLURFTU9QSwMEFAAAAAAAfYF3XfJu/XUpAAAAKQAAAAoAAABjb2xvcnMuY3N2Y29kZTtuYW1lO2hleApCTFVFLURFTU87RGVtbyBibHVlOyMzMzQ0NjZQSwECFAAUAAAAAAB9gXddYAP+cDEAAAAxAAAAEAAAAAAAAAAAAAAAgAEAAAAAZGVwb3NpdF90eXBlLmNzdlBLAQIUABQAAAAAAH2Bd13ybv11KQAAACkAAAAKAAAAAAAAAAAAAACAAV8AAABjb2xvcnMuY3N2UEsFBgAAAAACAAIAdgAAALAAAAAAAA=='
    const { result, workspace } = await importReferences(file('references.zip', Uint8Array.from(atob(zip), char => char.charCodeAt(0))), undefined, admin)
    expect(result.errors).toEqual([])
    expect(result.rows).toHaveLength(2)
    const color = workspace?.colors?.find(item => item.code === 'BLUE-DEMO')
    expect(workspace?.entries.find(entry => entry.values.code === 'ZIP-1')?.values.color_id).toBe(color?.id)
  })

  it('journals denied exchange without modifying the package data', async () => {
    const { result } = await importReferences(file('deposit_type.csv', 'code;name\nTEST;Тест'), undefined, reader)
    expect(result.errors[0]?.code).toBe('ACCESS_DENIED')
    expect((await referenceDataRepository.get()).activity).toEqual([expect.objectContaining({ action: 'ACCESS_DENIED', label: 'adm.nsi.exchange' })])
  })
})
