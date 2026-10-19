import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSection, initialSections } from '../../entities/geology-section/model/fixtures'
import { referenceSection } from '../../entities/geology-section/model/referenceSection'
import { sectionRepository } from './sectionRepository'
import { SECTION_STORAGE_KEY, SECTION_DEMO_BACKUP_KEY } from './sectionStorageKeys'
import { userPersonas } from '../../entities/session/model/personas'

afterEach(() => { localStorage.removeItem(SECTION_STORAGE_KEY); localStorage.removeItem(SECTION_DEMO_BACKUP_KEY); vi.restoreAllMocks() })

describe('shared reference demonstration bootstrap', () => {
  it('refreshes only the common demo and retains the preceding saved snapshot', async () => {
    const original = initialSections(), independent = createSection('GTR-NEW-1', 'Собственный разрез')
    original[0]!.revision = 7; original[0]!.title = 'Название пользователя'
    localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify([...original, independent]))
    const docs = await sectionRepository.demoList()
    expect(docs[0]).toMatchObject({ id: 'GTR-01', title: 'Название пользователя', revision: 8, demoPreset: 'video-reference-v3', metadata: { geoBlock: 'ГБ-01', techBlock: 'ТБ-01' }, segmentWells: { 'GTR-01-v1:GTR-01-v2': ['GTR-W1', 'GTR-W2', 'GTR-W3', 'GTR-W4'], 'GTR-01-v2:GTR-01-v3': ['GTR-W5', 'GTR-W6', 'GTR-W7'] } })
    expect(docs[1]).toEqual(original[1]); expect(docs[2]).toEqual(independent)
    expect(JSON.parse(localStorage.getItem(SECTION_DEMO_BACKUP_KEY)!)).toEqual(original[0])
    const editor = userPersonas.find(persona => persona.id === 'geo.ivanova')!
    const saved = sectionRepository.save({ ...docs[0]!, description: 'Правки нового примера' }, 8, editor)
    expect((await sectionRepository.demoList())[0]).toEqual(saved)
    expect(JSON.parse(localStorage.getItem(SECTION_DEMO_BACKUP_KEY)!)).toEqual(original[0])
  })
  it('seeds one new common document, and never recreates a removed one', async () => {
    const docs = await sectionRepository.demoList()
    expect(docs).toHaveLength(2)
    expect(docs[0]?.demoPreset).toBe('video-reference-v3')
    expect(docs[0]?.revision).toBe(0)
    expect(localStorage.getItem(SECTION_DEMO_BACKUP_KEY)).toBeNull()
    localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify([docs[1]]))
    expect(await sectionRepository.demoList()).toEqual([docs[1]])
  })
  it('adds block metadata to a saved v2 reference while preserving user edits', async () => {
    const previous = { ...referenceSection(), demoPreset: 'video-reference-v2', revision: 4, title: 'Сохранённый пример', description: 'Пользовательский текст', metadata: { ...referenceSection().metadata!, geoBlock: 'ГБ-02', techBlock: '' } }
    localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify([previous]))
    const docs = await sectionRepository.demoList()
    expect(docs[0]).toMatchObject({ revision: 5, title: 'Сохранённый пример', description: 'Пользовательский текст', demoPreset: 'video-reference-v3', metadata: { geoBlock: 'ГБ-02', techBlock: 'ТБ-01' } })
    expect(JSON.parse(localStorage.getItem(SECTION_DEMO_BACKUP_KEY)!)).toEqual(previous)
  })
  it('leaves an unreadable registry and a failed write intact', async () => {
    localStorage.setItem(SECTION_STORAGE_KEY, '{invalid')
    await expect(sectionRepository.demoList()).rejects.toThrow('оставлены без изменений')
    expect(localStorage.getItem(SECTION_STORAGE_KEY)).toBe('{invalid')
    const bytes = JSON.stringify(initialSections()); localStorage.setItem(SECTION_STORAGE_KEY, bytes)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Quota exceeded', 'QuotaExceededError') })
    await expect(sectionRepository.demoList()).rejects.toThrow('Quota exceeded')
    expect(localStorage.getItem(SECTION_STORAGE_KEY)).toBe(bytes)
  })
})
