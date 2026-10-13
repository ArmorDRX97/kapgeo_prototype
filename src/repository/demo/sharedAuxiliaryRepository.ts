import { z } from 'zod'
import type { SharedAuxiliary, GeologySection } from '../../entities/geology-section/model/types'
import { sectionWellSources } from '../../entities/geology-section/model/fixtures'
import type { UserPersona } from '../../entities/session/model/types'
import { hasPermission } from '../../shared/auth/permissions'
import { SECTION_STORAGE_KEY, SHARED_AUXILIARY_STORAGE_KEY } from './sectionStorageKeys'

const schema = z.object({ id: z.string().min(1), revision: z.number().int().positive(), scope: z.literal('geology-section-prototype'), wellId: z.string(), layer: z.enum(['technology', 'ore', 'uncorrected', 'offbalance']), from: z.number().finite().nonnegative(), to: z.number().finite().positive() })
function validate(value: unknown): SharedAuxiliary {
  const parsed = schema.safeParse(value)
  if (!parsed.success || parsed.data.to <= parsed.data.from || !sectionWellSources.some(w => w.id === parsed.data.wellId)) throw new Error('Проверьте скважину и положительную мощность общей опоры.')
  return parsed.data
}
function read(): SharedAuxiliary[] {
  const raw = localStorage.getItem(SHARED_AUXILIARY_STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('Неверный формат.')
    const items = parsed.map(validate)
    if (new Set(items.map(s => s.id)).size !== items.length) throw new Error('Повторяются ID опор.')
    return items
  } catch (cause) { throw new Error('Не удалось прочитать общие опоры. Исходные сохранения оставлены без изменений.', { cause }) }
}
function requireEdit(persona: UserPersona | null) { if (!hasPermission(persona, 'geology.sections.edit')) throw new Error('Общие опоры доступны только для просмотра.') }
function write(items: SharedAuxiliary[]) { localStorage.setItem(SHARED_AUXILIARY_STORAGE_KEY, JSON.stringify(items)) }
export function validateSharedSnapshots(section: GeologySection) {
  const refs = section.auxiliary?.filter(a => a.sharedId) ?? []
  if (!refs.length) return
  const sources = read()
  for (const ref of refs) {
    const source = sources.find(s => s.id === ref.sharedId)
    if (!source || source.wellId !== ref.wellId || source.layer !== ref.layer || !ref.sourceRevision || ref.sourceRevision > source.revision) throw new Error('Общая опора удалена или несовместима. Обновите реестр опор и проверьте черновик.')
    if (ref.sourceRevision === source.revision && (ref.from !== source.from || ref.to !== source.to)) throw new Error('Границы опоры не соответствуют применённой ревизии. Выполните коррекцию общей опоры.')
  }
}
export const sharedAuxiliaryRepository = {
  list: read,
  create(input: Omit<SharedAuxiliary, 'id' | 'revision' | 'scope'>, persona: UserPersona | null) {
    requireEdit(persona)
    const items = read()
    const next = validate({ ...input, id: `SHARED-AUX-${crypto.randomUUID()}`, revision: 1, scope: 'geology-section-prototype' })
    write([...items, next]); return next
  },
  update(input: SharedAuxiliary, expectedRevision: number, persona: UserPersona | null) {
    requireEdit(persona)
    const items = read(), current = items.find(s => s.id === input.id)
    if (!current || current.revision !== expectedRevision) throw new Error('Общая опора изменилась в другой вкладке. Обновите список перед повтором.')
    if (input.wellId !== current.wellId || input.layer !== current.layer) throw new Error('Скважина и слой существующей опоры неизменны.')
    const next = validate({ ...input, revision: current.revision + 1 }); write(items.map(s => s.id === next.id ? next : s)); return next
  },
  remove(id: string, expectedRevision: number, persona: UserPersona | null) {
    requireEdit(persona)
    const items = read(), current = items.find(s => s.id === id)
    if (!current || current.revision !== expectedRevision) throw new Error('Общая опора изменилась. Обновите список.')
    const raw = localStorage.getItem(SECTION_STORAGE_KEY)
    if (raw) {
      let docs: unknown
      try { docs = JSON.parse(raw) } catch { throw new Error('Не удалось проверить зависимости в реестре разрезов. Удаление отменено.') }
      if (!Array.isArray(docs) || docs.some(d => !d || typeof d !== 'object' || 'auxiliary' in d && d.auxiliary !== undefined && !Array.isArray(d.auxiliary))) throw new Error('Не удалось проверить зависимости в реестре разрезов. Удаление отменено.')
      if (docs.some(d => d.auxiliary?.some((a: { sharedId?: string }) => a.sharedId === id))) throw new Error('Опора используется разрезами. Сначала удалите её из состава всех разрезов и сохраните их.')
    }
    write(items.filter(s => s.id !== id))
  },
}
