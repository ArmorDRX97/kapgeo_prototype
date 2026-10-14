import { z } from 'zod'
import { initialMaps } from '../../entities/geology-map/fixtures'
import { projectSchema, type MapProject } from '../../entities/geology-map/model'
import type { UserPersona } from '../../entities/session/model/types'
import { hasPermission } from '../../shared/auth/permissions'

export const MAP_STORAGE_KEY = 'kapgeo.geology.maps.v1'
const envelope = z.object({ version: z.literal(1), projects: z.array(projectSchema).max(100) }).superRefine((v, c) => { if (new Set(v.projects.map(p => p.id)).size !== v.projects.length) c.addIssue({ code: 'custom', message: 'Повторяются проекты.' }) })
export function canEditMap(persona: UserPersona | null, project: MapProject) { return hasPermission(persona, 'geology.maps.edit') && !project.locked && project.scope === 'north' && (!!persona?.scope.includes('Северный') || hasPermission(persona, 'administration.references.create')) }
function read(): MapProject[] {
  const raw = localStorage.getItem(MAP_STORAGE_KEY)
  if (!raw) return initialMaps()
  try { return envelope.parse(JSON.parse(raw)).projects } catch { throw new Error('Локальное хранилище планов повреждено или имеет другую версию. Можно повторить чтение, скачать исходную копию или восстановить примеры.') }
}
function write(projects: MapProject[]) { const checked = envelope.parse({ version: 1, projects }); try { localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(checked)) } catch { throw new Error('Не удалось сохранить план: браузер запретил запись или закончилась квота. Правки остались в рабочем окне.') } }
export const mapRepository = {
  list: async () => read(),
  save(project: MapProject, persona: UserPersona | null): MapProject {
    const projects = read(), stored = projects.find(p => p.id === project.id)
    if (!canEditMap(persona, stored ?? project)) throw new Error('Нет разрешения на изменение этого плана.')
    if (stored && stored.revision !== project.revision) throw new Error('План изменён в другом окне. Скачайте свои правки и повторно откройте сохранённую версию.')
    const checked = projectSchema.safeParse({ ...project, revision: project.revision + 1 })
    if (!checked.success) throw new Error(checked.error.issues[0]?.message ?? 'Проверьте геометрию и поля проекта.')
    const next = checked.data; write(stored ? projects.map(p => p.id === next.id ? next : p) : [...projects, next]); return next
  },
  remove(project: MapProject, persona: UserPersona | null) {
    const projects = read(), stored = projects.find(p => p.id === project.id)
    if (!stored || !canEditMap(persona, stored) || !hasPermission(persona, 'geology.maps.delete')) throw new Error('Удаление этого плана недоступно.')
    if (stored.revision !== project.revision) throw new Error('Сохранённая версия изменилась. Откройте план заново.')
    write(projects.filter(p => p.id !== project.id))
  },
  reset() { localStorage.removeItem(MAP_STORAGE_KEY) },
  raw() { return localStorage.getItem(MAP_STORAGE_KEY) ?? '' },
}

function rasterRequest<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('kapgeo-geology-map-rasters', 1)
    open.onupgradeneeded = () => { open.result.createObjectStore('rasters') }
    open.onerror = () => reject(new Error('Хранилище подложек недоступно.'))
    open.onsuccess = () => {
      const db = open.result, tx = db.transaction('rasters', mode), req = operation(tx.objectStore('rasters'))
      tx.oncomplete = () => { db.close(); resolve(req.result) }
      tx.onerror = tx.onabort = () => { db.close(); reject(new Error('Не удалось записать или прочитать подложку.')) }
    }
  })
}
export const mapRasterRepository = { put: (key: string, blob: Blob) => rasterRequest('readwrite', s => s.put(blob, key)), get: (key: string) => rasterRequest<Blob | undefined>('readonly', s => s.get(key)) }
