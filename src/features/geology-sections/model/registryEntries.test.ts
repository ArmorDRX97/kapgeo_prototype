import { describe, expect, it } from 'vitest'
import { createSection, initialSections } from '../../../entities/geology-section/model/fixtures'
import { sectionRegistryEntries } from './registryEntries'

describe('demonstration section registry', () => {
  it('gives demo links distinct identities in eight blocks without copying documents', () => {
    const documents = initialSections(), before = JSON.stringify(documents)
    const rows = sectionRegistryEntries(documents)
    const examples = rows.filter(row => row.demo)
    expect(rows.filter(row => !row.demo).map(row => row.id)).toEqual(['GTR-01', 'GTR-02'])
    expect(examples).toHaveLength(32)
    expect(new Set(rows.map(row => row.id)).size).toBe(rows.length)
    expect(new Set(examples.map(row => row.techBlock)).size).toBe(8)
    expect(examples.filter(row => row.techBlock === 'ТБ-02').map(row => row.title)).toEqual(['Разрез 01', 'Разрез 02', 'Разрез 03', 'Разрез 04'])
    expect(examples.every(row => row.documentId === 'GTR-01')).toBe(true)
    expect(rows.filter(row => row.status === 'locked').map(row => row.id)).toEqual(['GTR-02'])
    expect(rows.every(row => !('graphics' in row) && !('profile' in row) && !('wellIds' in row) && !('wells' in row))).toBe(true)
    expect(JSON.stringify(documents)).toBe(before)
  })
  it('keeps shared saved metadata current and preserves separately created documents', () => {
    const documents = initialSections()
    const shared = documents[0]!
    shared.status = 'locked'
    documents.push(createSection('GTR-NEW-1', 'Собственный разрез'))
    const rows = sectionRegistryEntries(documents)
    expect(rows.filter(row => !row.demo)).toHaveLength(3)
    const profileRows = rows.filter(row => row.documentId === 'GTR-01')
    expect(profileRows.every(row => row.status === 'locked')).toBe(true)
    expect(rows.find(row => row.id === 'GTR-NEW-1')?.documentId).toBe('GTR-NEW-1')
    expect(sectionRegistryEntries(documents.filter(document => document.id !== 'GTR-01')).map(row => row.id)).toEqual(['GTR-02', 'GTR-NEW-1'])
  })
  it('exposes block metadata and uses the section year when creation date is missing', () => {
    const document = initialSections()[0]!
    document.metadata = { ...document.metadata!, geoBlock: 'Geo A', techBlock: 'Tech B' } as typeof document.metadata
    const row = sectionRegistryEntries([document])[0]!
    expect(row).toMatchObject({ geoBlock: 'Geo A', techBlock: 'Tech B', createdOn: '2026-01-01' })
    document.metadata = { ...document.metadata!, createdOn: '' }
    expect(sectionRegistryEntries([document])[0]?.createdOn).toBe(`${document.year}-01-01`)
  })
})
