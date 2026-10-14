import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mapRepository, MAP_STORAGE_KEY, canEditMap } from './mapRepository'
import { emptyMap, initialMaps } from '../../entities/geology-map/fixtures'
import { userPersonas } from '../../entities/session/model/personas'
const geo = userPersonas[0]!, viewer = userPersonas.find(p => p.id === 'reserves.lee')!, admin = userPersonas.find(p => p.id === 'admin.system')!
describe('independent map repository', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks() })
  it('does not write on opening and saves only its own namespace', async () => {
    localStorage.setItem('bgd-other', 'untouched'); const docs = await mapRepository.list(); expect(localStorage.getItem(MAP_STORAGE_KEY)).toBeNull()
    const saved = mapRepository.save({ ...docs[0]!, title: 'Changed' }, geo); expect(saved.revision).toBe(1)
    expect((await mapRepository.list())[0]!.title).toBe('Changed'); expect(localStorage.getItem('bgd-other')).toBe('untouched')
  })
  it('checks permission, scope and stored locked state', () => {
    const [p, locked] = initialMaps()
    expect(canEditMap(geo, p!)).toBe(true); expect(canEditMap(admin, p!)).toBe(true); expect(canEditMap(viewer, p!)).toBe(false)
    expect(canEditMap({ ...geo, scope: 'Другой участок' }, p!)).toBe(false)
    expect(() => mapRepository.save({ ...locked!, locked: false }, geo)).toThrow('Нет разрешения')
    expect(() => mapRepository.save(p!, viewer)).toThrow('Нет разрешения')
  })
  it('rejects stale saves and deletes without overwriting another window', async () => {
    const p = (await mapRepository.list())[0]!, saved = mapRepository.save(p, geo)
    expect(() => mapRepository.save({ ...p, title: 'stale' }, geo)).toThrow('другом окне')
    expect(() => mapRepository.remove(p, geo)).toThrow('версия изменилась')
    expect((await mapRepository.list())[0]!.revision).toBe(saved.revision)
  })
  it('preserves corrupt data and reports failure instead of reseeding', async () => {
    localStorage.setItem(MAP_STORAGE_KEY, '{broken'); await expect(mapRepository.list()).rejects.toThrow('повреждено'); expect(localStorage.getItem(MAP_STORAGE_KEY)).toBe('{broken')
  })
  it('reports a failed write without altering saved data or the input document', async () => {
    const saved = mapRepository.save((await mapRepository.list())[0]!, geo), before = localStorage.getItem(MAP_STORAGE_KEY), edited = { ...saved, title: 'Still in memory' }
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new DOMException('Quota exceeded', 'QuotaExceededError') })
    expect(() => mapRepository.save(edited, geo)).toThrow('Правки остались')
    expect(localStorage.getItem(MAP_STORAGE_KEY)).toBe(before); expect(edited.title).toBe('Still in memory'); expect(edited.revision).toBe(saved.revision)
  })
  it('validates duplicate well names and removes only the selected project', async () => {
    const p = (await mapRepository.list())[0]!, a = p.objects.find(o => o.kind === 'well')!, b = p.objects.filter(o => o.kind === 'well')[1]!
    expect(() => mapRepository.save({ ...p, objects: p.objects.map(o => o.id === b.id ? { ...o, name: a.name } : o) }, geo)).toThrow('Номер скважины')
    const created = mapRepository.save(emptyMap('new', 'New plan'), geo); mapRepository.remove(created, geo)
    expect((await mapRepository.list()).map(p => p.id)).toEqual(['MAP-01', 'MAP-02', 'MAP-03'])
  })
})
