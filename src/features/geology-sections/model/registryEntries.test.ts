import { describe, expect, it } from 'vitest'
import { createSection, initialSections } from '../../../entities/geology-section/model/fixtures'
import { sectionRegistryEntries } from './registryEntries'

describe('demonstration section registry', () => {
  it('shows 200 unique rows referencing only the two original documents', () => {
    const documents = initialSections(), before = JSON.stringify(documents)
    const rows = sectionRegistryEntries(documents)
    expect(rows).toHaveLength(200)
    expect(new Set(rows.map(row => row.id)).size).toBe(200)
    expect(new Set(rows.map(row => row.title)).size).toBe(200)
    expect(rows.filter(row => row.documentId === 'GTR-01')).toHaveLength(199)
    expect(rows.filter(row => row.status === 'locked').map(row => row.id)).toEqual(['GTR-02'])
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
    expect(rows).toHaveLength(201)
    expect(rows.filter(row => row.documentId === 'GTR-01').every(row => row.wellCount === 1 && row.status === 'locked')).toBe(true)
    expect(rows.find(row => row.id === 'GTR-NEW-1')?.documentId).toBe('GTR-NEW-1')
    expect(sectionRegistryEntries(documents.filter(document => document.id !== 'GTR-01')).map(row => row.id)).toEqual(['GTR-02', 'GTR-NEW-1'])
  })
})
