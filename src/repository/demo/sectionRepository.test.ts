import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSection, initialSections } from '../../entities/geology-section/model/fixtures'
import { userPersonas } from '../../entities/session/model/personas'
import { SECTION_STORAGE_KEY, sectionRepository, validateSection } from './sectionRepository'
import { layerAnchors } from '../../entities/geology-section/lib/correlation'
import { newDrawing } from '../../entities/geology-section/lib/drawing'
import { referenceWellSources } from '../../entities/geology-section/model/referenceSources'
const editor = userPersonas.find(p => p.id === 'geo.ivanova')!, reader = userPersonas.find(p => p.id === 'gis.askarov')!
afterEach(() => { localStorage.removeItem(SECTION_STORAGE_KEY); vi.restoreAllMocks() })
describe('isolated section persistence', () => {
  it('persists an explicit reference preset and accepts its deep MD ranges without migrating other documents', async () => {
    const section = createSection('REFERENCE-PERSISTENCE', 'Разрез по эталону'), well = referenceWellSources[0]!
    section.demoPreset = 'video-reference-v1'; section.top = 200; section.bottom = -1000
    section.wellIds = [well.id]; section.sourceRevisions = { [well.id]: well.revision }
    section.sourceOverrides = { [well.id]: { revision: 2, technology: [{ id: 'deep', from: well.depth - 5, to: well.depth - 2, kind: 'permeable' }], ore: [], uncorrected: [], offbalance: [] } }
    section.participation.technology = [well.id]
    section.columnSettings = { all: { width: 12, offset: 0, lithology: true, intervals: true, curves: true, curveMin: 0, curveMax: 80, curveSettings: { [well.curves[0]!.id]: { visible: true, min: 0, max: 80, from: well.depth - 10, to: well.depth } } } }
    const created = sectionRepository.create(section, editor), saved = sectionRepository.save({ ...created, description: 'Проверка сохранения' }, created.revision, editor), docs = await sectionRepository.list()
    expect(docs.find(doc => doc.id === saved.id)).toEqual(saved)
    expect(saved.demoPreset).toBe('video-reference-v1')
    expect(docs.find(doc => doc.id === 'GTR-01')).not.toHaveProperty('demoPreset')
    expect(() => validateSection({ ...saved, demoPreset: 'unknown-preset' })).toThrow('несовместимые')
  })
  it('retires old rhythm boundaries on read, retaining foundation geometry and untouched stored bytes', async () => {
    const doc = initialSections()[0]!, anchors = layerAnchors(doc, 'technology'), a = anchors[0]!, b = anchors.find(p => p.wellId !== a.wellId)!
    doc.links.technology = [{ id: 'legacy-link', a: a.id, b: b.id }]
    const legacy = { ...doc, units: [{ id: 'u', name: 'Пачка', description: '' }], graphics: [
      { id: 'roof', type: 'roof', name: 'Кровля', unitId: 'u', points: [], contourLinks: ['legacy-link'], closed: false, reversed: false, smooth: false },
      { id: 'f', type: 'foundation', name: 'Фундамент', points: [], references: ['roof'], closed: false, reversed: false, smooth: false },
    ], drawings: [{ ...newDrawing(doc, 'd'), layers: ['technology', 'roof', 'base', 'foundation'] }] }
    const bytes = JSON.stringify([legacy]); localStorage.setItem(SECTION_STORAGE_KEY, bytes)
    const read = (await sectionRepository.list())[0]!
    expect(read.graphics).toEqual([expect.objectContaining({ id: 'f', type: 'foundation', points: [a.top, b.top], detachedFromContour: true })])
    expect(read).not.toHaveProperty('units'); expect(read.graphics[0]).not.toHaveProperty('references')
    expect(read.drawings[0]!.layers).toEqual(['technology', 'foundation'])
    expect(read.revision).toBe(doc.revision); expect(localStorage.getItem(SECTION_STORAGE_KEY)).toBe(bytes)
    const saved = sectionRepository.save(read, read.revision, editor)
    expect((await sectionRepository.list())[0]).toEqual(saved)
    expect(localStorage.getItem(SECTION_STORAGE_KEY)).not.toContain('"roof"')
  })
  it('rejects cyclic legacy references and preserves the original document', async () => {
    const doc = initialSections()[0]!, legacy = { ...doc, graphics: [ { id: 'f', type: 'foundation', name: 'Фундамент', points: [], references: ['f'], closed: false, reversed: false, smooth: false } ] }
    const bytes = JSON.stringify([legacy]); localStorage.setItem(SECTION_STORAGE_KEY, bytes)
    await expect(sectionRepository.list()).rejects.toThrow('оставлены без изменений')
    expect(localStorage.getItem(SECTION_STORAGE_KEY)).toBe(bytes)
  })
  it('saves arbitrary tracks and rejects unknown sources without replacing storage', async () => {
    const doc = initialSections()[0]!
    doc.columnSettings = { all: { width: 12, offset: 0, lithology: true, intervals: true, curves: true, curveMin: 0, curveMax: 80, tracks: [{ id: 'gr', type: 'curve', curveId: 'gr', width: 42 }, { id: 'l', type: 'lithology', width: 8 }] } }
    const saved = sectionRepository.save(doc, 0, editor), bytes = localStorage.getItem(SECTION_STORAGE_KEY)
    expect((await sectionRepository.list())[0]!.columnSettings).toEqual(saved.columnSettings)
    expect(() => validateSection({ ...saved, columnSettings: { all: { ...saved.columnSettings!.all, tracks: [{ id: 'bad', type: 'curve', curveId: 'missing', width: 24 }] } } })).toThrow('источник')
    expect(localStorage.getItem(SECTION_STORAGE_KEY)).toBe(bytes)
  })
  it('creates, saves, reloads and deletes only its own namespace', async () => {
    localStorage.setItem('unrelated-test-document', 'keep')
    const doc = sectionRepository.create(createSection('LOCAL-NEW', 'Новый профиль'), editor)
    const saved = sectionRepository.save({ ...doc, title: 'Изменённый профиль' }, doc.revision, editor)
    expect((await sectionRepository.list()).find(s => s.id === doc.id)).toEqual(saved)
    sectionRepository.remove(doc.id, saved.revision, editor)
    expect((await sectionRepository.list()).some(s => s.id === doc.id)).toBe(false)
    expect(localStorage.getItem('unrelated-test-document')).toBe('keep'); localStorage.removeItem('unrelated-test-document')
  })
  it('rejects view-only users, locked objects and stale writes', () => {
    const [doc, locked] = initialSections()
    expect(() => sectionRepository.save(doc!, 0, reader)).toThrow('просмотра')
    expect(() => sectionRepository.save(locked!, 0, editor)).toThrow('просмотра')
    sectionRepository.save(doc!, 0, editor)
    expect(() => sectionRepository.save(doc!, 0, editor)).toThrow('другой вкладке')
  })
  it('rejects drawing ranges outside the trace without replacing saved content', () => {
    const doc = initialSections()[0]!
    sectionRepository.save(doc, 0, editor)
    const previous = localStorage.getItem(SECTION_STORAGE_KEY), drawing = { ...newDrawing(doc, 'd'), right: 10000 }
    expect(() => sectionRepository.save({ ...doc, drawings: [drawing] }, 1, editor)).toThrow('диапазон')
    expect(localStorage.getItem(SECTION_STORAGE_KEY)).toBe(previous)
  })
  it('keeps stored bytes on invalid input, corrupt data and storage failure', async () => {
    const doc = initialSections()[0]!
    sectionRepository.save(doc, 0, editor)
    const previous = localStorage.getItem(SECTION_STORAGE_KEY)
    expect(() => sectionRepository.save({ ...doc, top: -100 }, 1, editor)).toThrow('Верхняя')
    expect(localStorage.getItem(SECTION_STORAGE_KEY)).toBe(previous)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(() => sectionRepository.save(doc, 1, editor)).toThrow('quota')
    expect(localStorage.getItem(SECTION_STORAGE_KEY)).toBe(previous)
    vi.restoreAllMocks(); localStorage.setItem(SECTION_STORAGE_KEY, '{broken')
    await expect(sectionRepository.list()).rejects.toThrow('оставлены без изменений')
    expect(localStorage.getItem(SECTION_STORAGE_KEY)).toBe('{broken')
  })
})
