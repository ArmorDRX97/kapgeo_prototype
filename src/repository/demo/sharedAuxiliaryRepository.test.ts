import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSection, initialSections } from '../../entities/geology-section/model/fixtures'
import { applySharedAuxiliary, staleAuxiliary } from '../../entities/geology-section/lib/sharedAuxiliary'
import { layerAnchors } from '../../entities/geology-section/lib/correlation'
import type { GeologySection, SharedAuxiliary } from '../../entities/geology-section/model/types'
import { userPersonas } from '../../entities/session/model/personas'
import { sectionRepository } from './sectionRepository'
import { sharedAuxiliaryRepository } from './sharedAuxiliaryRepository'
import { SECTION_STORAGE_KEY, SHARED_AUXILIARY_STORAGE_KEY } from './sectionStorageKeys'

const editor = userPersonas.find(p => p.id === 'geo.ivanova')!, reader = userPersonas.find(p => p.id === 'gis.askarov')!
const input = { wellId: 'GTR-W1', layer: 'technology' as const, from: 145, to: 147 }
function attach(doc: GeologySection, source: SharedAuxiliary): GeologySection {
  return { ...doc, wellIds: [...new Set([...doc.wellIds, source.wellId])], participation: { ...doc.participation, technology: [...new Set([...doc.participation.technology, source.wellId])] }, auxiliary: [{ id: source.id, sharedId: source.id, sourceRevision: source.revision, wellId: source.wellId, layer: source.layer, from: source.from, to: source.to }] }
}
afterEach(() => { vi.restoreAllMocks(); localStorage.removeItem(SECTION_STORAGE_KEY); localStorage.removeItem(SHARED_AUXILIARY_STORAGE_KEY) })
describe('shared auxiliary sources limited to sections', () => {
  it('keeps two section snapshots until each explicitly applies the newer revision', async () => {
    const source = sharedAuxiliaryRepository.create(input, editor)
    const first = sectionRepository.save(attach(initialSections()[0]!, source), 0, editor)
    const second = sectionRepository.create(attach(createSection('GTR-OTHER', 'Второй разрез'), source), editor)
    const updated = sharedAuxiliaryRepository.update({ ...source, to: 148 }, 1, editor)
    const stored = await sectionRepository.list()
    for (const doc of [stored.find(s => s.id === first.id)!, stored.find(s => s.id === second.id)!]) {
      expect(doc.auxiliary![0]!.to).toBe(147); expect(staleAuxiliary(doc, [updated])).toHaveLength(1)
    }
    const correction = applySharedAuxiliary(first, [updated])
    expect(correction.section.auxiliary![0]).toMatchObject({ to: 148, sourceRevision: 2 })
    expect(layerAnchors(correction.section, 'technology').find(a => a.id.endsWith(`/${source.id}`))!.bottom.z).toBe(-43)
    sectionRepository.save(correction.section, first.revision, editor)
    expect((await sectionRepository.list()).find(s => s.id === second.id)!.auxiliary![0]!.to).toBe(147)
    expect(initialSections()[1]!.status).toBe('locked')
  })
  it('prevents removal while any saved section references the source', () => {
    const source = sharedAuxiliaryRepository.create(input, editor)
    const doc = sectionRepository.save(attach(initialSections()[0]!, source), 0, editor)
    expect(() => sharedAuxiliaryRepository.remove(source.id, 1, editor)).toThrow('используется')
    sectionRepository.save({ ...doc, auxiliary: [] }, doc.revision, editor)
    sharedAuxiliaryRepository.remove(source.id, 1, editor)
    expect(sharedAuxiliaryRepository.list()).toEqual([])
    expect(() => sectionRepository.save({ ...doc, revision: 2 }, 2, editor)).toThrow('удалена')
  })
  it('rejects read-only source commands and conflicting revisions', () => {
    expect(() => sharedAuxiliaryRepository.create(input, reader)).toThrow('просмотра')
    const source = sharedAuxiliaryRepository.create(input, editor)
    sharedAuxiliaryRepository.update({ ...source, to: 148 }, 1, editor)
    expect(() => sharedAuxiliaryRepository.update(source, 1, editor)).toThrow('другой вкладке')
    expect(() => sharedAuxiliaryRepository.remove(source.id, 1, reader)).toThrow('просмотра')
  })
  it('preserves bytes on malformed storage and quota failures', () => {
    const source = sharedAuxiliaryRepository.create(input, editor), previous = localStorage.getItem(SHARED_AUXILIARY_STORAGE_KEY)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(() => sharedAuxiliaryRepository.update({ ...source, to: 148 }, 1, editor)).toThrow('quota')
    expect(localStorage.getItem(SHARED_AUXILIARY_STORAGE_KEY)).toBe(previous)
    vi.restoreAllMocks(); localStorage.setItem(SHARED_AUXILIARY_STORAGE_KEY, '{broken')
    expect(() => sharedAuxiliaryRepository.list()).toThrow('без изменений')
    expect(localStorage.getItem(SHARED_AUXILIARY_STORAGE_KEY)).toBe('{broken')
  })
})
