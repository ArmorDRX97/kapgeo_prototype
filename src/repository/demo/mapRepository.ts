import { z } from 'zod'
import { initialMaps } from '../../entities/geology-map/fixtures'
import { objectSchema, projectSchema, type MapProject } from '../../entities/geology-map/model'
import type { UserPersona } from '../../entities/session/model/types'
import { hasPermission } from '../../shared/auth/permissions'
import { upgradeMap } from '../../entities/geology-map/migrate'
import { depositField, FIELD_ID } from '../../entities/geology-map/fieldScene'

export const MAP_STORAGE_KEY = 'kapgeo.geology.maps.v1'
const FIELD_STORAGE_KEY = 'kapgeo.geology.field-layout.v2'
const fieldBaseline = new Map(depositField.objects.map(o => [o.id, JSON.stringify(objectSchema.parse(o))]))
function readField(): MapProject {
  try {
    const raw = localStorage.getItem(FIELD_STORAGE_KEY)
    if (!raw) return depositField
    const { objects, removed, ...metadata } = JSON.parse(raw) as Partial<MapProject> & { removed?: string[] }
    const edits = new Map((objects ?? []).map(o => [o.id, o])), deleted = new Set(removed ?? [])
    return projectSchema.parse({ ...depositField, ...metadata, objects: [...depositField.objects.filter(o => !deleted.has(o.id)).map(o => edits.get(o.id) ?? o), ...[...edits.values()].filter(o => !depositField.objects.some(b => b.id === o.id))] })
  } catch { throw new Error('Не удалось прочитать оформление плана месторождения. Скачайте исходную копию перед восстановлением.') }
}
const envelope = z.object({ version: z.literal(1), projects: z.array(projectSchema).max(100) }).superRefine((v, c) => { if (new Set(v.projects.map(p => p.id)).size !== v.projects.length) c.addIssue({ code: 'custom', message: 'Повторяются проекты.' }) })
export function canEditMap(persona: UserPersona | null, project: MapProject) { return hasPermission(persona, 'geology.maps.edit') && !project.locked && project.scope === 'north' && (!!persona?.scope.includes('Северный') || hasPermission(persona, 'administration.references.create')) }
function read(): MapProject[] {
  const raw = localStorage.getItem(MAP_STORAGE_KEY)
  if (!raw) return initialMaps()
  try { return envelope.parse(JSON.parse(raw)).projects.map(p => projectSchema.parse(upgradeMap(p))) } catch { throw new Error('Локальное хранилище планов повреждено или имеет другую версию. Можно повторить чтение, скачать исходную копию или восстановить примеры.') }
}
function write(projects: MapProject[]) { const checked = envelope.parse({ version: 1, projects: projects.filter(p => p.id !== FIELD_ID) }); try { localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(checked)) } catch { throw new Error('Не удалось сохранить план: браузер запретил запись или закончилась квота. Правки остались в рабочем окне.') } }
function writeField(project: MapProject) {
  const { objects, ...metadata } = project, base = new Map(depositField.objects.map(o => [o.id, o])), ids = new Set(objects.map(o => o.id))
  const changes = objects.filter(o => JSON.stringify(o) !== fieldBaseline.get(o.id))
  try { localStorage.setItem(FIELD_STORAGE_KEY, JSON.stringify({ ...metadata, objects: changes, removed: [...base.keys()].filter(id => !ids.has(id)) })) } catch { throw new Error('Не удалось сохранить оформление плана. Правки остались в рабочем окне.') }
}
export const mapRepository = {
  list: async () => [readField(), ...read()],
  save(project: MapProject, persona: UserPersona | null): MapProject {
    const projects = read(), stored = project.id === FIELD_ID ? readField() : projects.find(p => p.id === project.id)
    if (!canEditMap(persona, stored ?? project)) throw new Error('Нет разрешения на изменение этого плана.')
    if (stored && stored.revision !== project.revision) throw new Error('План изменён в другом окне. Скачайте свои правки и повторно откройте сохранённую версию.')
    const nextObjects = new Map(project.objects.map(o => [o.id, o]))
    if (stored?.objects.some(w => w.kind === 'well' && JSON.stringify(w.parts) !== JSON.stringify(nextObjects.get(w.id)?.parts))) throw new Error('Исходные скважины нельзя перемещать или удалять в редакторе плана. Изменяйте точки контура блока.')
    const checked = projectSchema.safeParse({ ...project, revision: project.revision + 1 })
    if (!checked.success) throw new Error(checked.error.issues[0]?.message ?? 'Проверьте геометрию и поля проекта.')
    const next = checked.data; if (next.id === FIELD_ID) writeField(next); else write(stored ? projects.map(p => p.id === next.id ? next : p) : [...projects, next]); return next
  },
  remove(project: MapProject, persona: UserPersona | null) {
    const projects = read(), stored = project.id === FIELD_ID ? readField() : projects.find(p => p.id === project.id)
    if (!stored || !canEditMap(persona, stored) || !hasPermission(persona, 'geology.maps.delete')) throw new Error('Удаление этого плана недоступно.')
    if (stored.revision !== project.revision) throw new Error('Сохранённая версия изменилась. Откройте план заново.')
    if (project.id === FIELD_ID) throw new Error('Основной план месторождения используется как исходная схема.')
    write(projects.filter(p => p.id !== project.id))
  },
  reset() { localStorage.removeItem(MAP_STORAGE_KEY); localStorage.removeItem(FIELD_STORAGE_KEY); localStorage.removeItem('kapgeo.geology.field-layout.v1') },
  raw() { return JSON.stringify({ projects: localStorage.getItem(MAP_STORAGE_KEY), field: localStorage.getItem(FIELD_STORAGE_KEY), previousField: localStorage.getItem('kapgeo.geology.field-layout.v1') }) },
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
