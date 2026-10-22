import { describe, expect, it } from 'vitest'
import { createSection, initialSections } from '../../../entities/geology-section/model/fixtures'
import { sectionRegistryEntries } from './registryEntries'

describe('demonstration section registry', () => {
  it('shows only existing section documents with no artificial duplicate profiles', () => {
    const documents = initialSections(), before = JSON.stringify(documents)
    const rows = sectionRegistryEntries(documents)
    expect(rows).toHaveLength(2)
    expect(new Set(rows.map(row => row.id)).size).toBe(2)
    expect(new Set(rows.map(row => row.title)).size).toBe(2)
    expect(rows.filter(row => row.documentId === 'GTR-01')).toHaveLength(1)
    expect(rows.filter(row => row.status === 'locked').map(row => row.id)).toEqual(['GTR-02'])
    expect(rows.filter(row => row.stage === 'detailed')).toHaveLength(1)
    expect(rows.filter(row => row.stage === 'operationalExploration')).toHaveLength(1)
    expect(rows.every(row => !('graphics' in row) && !('profile' in row) && !('wellIds' in row))).toBe(true)
    expect(JSON.stringify(documents)).toBe(before)
  })
  it('keeps shared saved metadata current and preserves separately created documents', () => {
    const documents = initialSections()
    const shared = documents[0]!
    shared.wellIds = ['GTR-W1']
    shared.status = 'locked'
    documents.push(createSection('GTR-NEW-1', 'Собственный разрез'))
    const rows = sectionRegistryEntries(documents)
    expect(rows).toHaveLength(3)
    expect(rows.filter(row => row.documentId === 'GTR-01').every(row => row.wellCount === 1 && row.status === 'locked')).toBe(true)
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
