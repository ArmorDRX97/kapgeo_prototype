import { z } from 'zod'
import { initialSections } from '../../entities/geology-section/model/fixtures'
import { referenceSection } from '../../entities/geology-section/model/referenceSection'
import type { GeologySection } from '../../entities/geology-section/model/types'
import { profileIssues, profileLength } from '../../entities/geology-section/lib/profile'
import { correlationIssues, contourArcIssues, layerAnchors, virtualStationAtDepth, sectionSources } from '../../entities/geology-section/lib/correlation'
import { graphicIssues } from '../../entities/geology-section/lib/geometry'
import { resolveGraphicPoints } from '../../entities/geology-section/lib/boundaries'
import type { UserPersona } from '../../entities/session/model/types'
import { hasPermission } from '../../shared/auth/permissions'
import { SECTION_STORAGE_KEY, SECTION_DEMO_BACKUP_KEY } from './sectionStorageKeys'
import { trackIssues } from '../../entities/geology-section/lib/columnTracks'
import { retireRhythms } from '../../entities/geology-section/lib/retireRhythms'
import { validateSharedSnapshots } from './sharedAuxiliaryRepository'
import { sectionStageValues } from '../../entities/geology-section/model/stages'
import { segmentMembershipIssues } from '../../entities/geology-section/lib/segments'
export { SECTION_STORAGE_KEY } from './sectionStorageKeys'

const num = z.number().finite(), positive = num.positive()
const xy = z.object({ x: num, y: num }), xz = z.object({ x: num, z: num })
const ids = z.array(z.string().min(1))
const layerIds = z.object({ technology: ids, ore: ids, uncorrected: ids, offbalance: ids })
const links = z.array(z.object({ id: z.string(), a: z.string(), b: z.string() }))
const sourceIntervals = z.array(z.object({ id: z.string(), from: num.nonnegative(), to: positive, kind: z.enum(['permeable', 'impermeable']), grade: num.optional() }))
const schema = z.object({
  demoPreset: z.enum(['video-reference-v1', 'video-reference-v2', 'video-reference-v3']).optional(),
  schemaVersion: z.literal(1), id: z.string().min(1), revision: num.int().nonnegative(), synthetic: z.literal(true), scope: z.literal('geology-section-prototype'),
  title: z.string().trim().min(1).max(120), depositId: z.literal('GTR-LOCAL-NORTH'), depositName: z.literal('Полигон Северный'),
  stage: z.enum(sectionStageValues), kind: z.enum(['main', 'auxiliary']), year: num.int().min(1900).max(2100), description: z.string().max(5000),
  top: num, bottom: num, status: z.enum(['draft', 'locked']), profile: z.array(xy), wellIds: ids, sourceRevisions: z.record(z.string(), num.int().positive()),
  mapGeometry: z.object({ segments: z.record(z.string(), z.tuple([xy, xy])), wells: z.record(z.string(), xy) }).optional(),
  profileVertexIds: ids.optional(), segmentWells: z.record(z.string(),ids).optional(), profileRadiusM: num.min(0).max(100000).optional(),
  participation: layerIds, links: z.object({ technology: links, ore: links, uncorrected: links, offbalance: links }),
  graphics: z.array(z.object({ id: z.string(), type: z.enum(['lithology', 'oxidation', 'roof', 'base', 'foundation', 'fault']), name: z.string().trim().min(1), points: z.array(xz), closed: z.boolean(), reversed: z.boolean(), smooth: z.boolean(), rock: z.enum(['sand', 'clay', 'silt']).optional(), unitId: z.string().optional(), parentId: z.string().optional(), references: ids.optional(), contourLinks: ids.optional(), contourSnapshot: z.array(xz).optional(), detachedFromContour: z.boolean().optional() })),
  drawings: z.array(z.object({ id: z.string(), name: z.string().min(1), horizontalScale: positive, verticalScale: positive, top: num, bottom: num, left: num, right: num, planHeight: num.nonnegative(), paper: z.enum(['A4', 'A3']), landscape: z.boolean(), margin: num.nonnegative(), layers: ids, description: z.string(), overlap: num.min(0).max(20).optional(), center: z.boolean().optional(), pageOrder: z.enum(['rows', 'columns']).optional(), profileOffset: num.min(-100).max(100).optional(), separator: num.min(0).max(100).optional(), bottomField: num.min(26).max(200).optional(), appendix: z.string().max(60).optional(), firstSheet: positive.int().max(9999).optional(), legendSize: num.min(2).max(20).optional(), wellIds: ids.optional(), lithologyColumns: z.boolean().optional(), stems: z.boolean().optional(), logColumns: z.boolean().optional(), intervalColumns: z.boolean().optional(), oreParameters: z.boolean().optional(), legend: z.boolean().optional(), staticLevel: num.optional(), frozenBoundary: num.optional(), columnSettings: z.record(z.string(), z.object({ width: num.min(2).max(40), offset: num, lithology: z.boolean(), intervals: z.boolean(), curves: z.boolean(), curveMin: num, curveMax: num, curvesFirst: z.boolean().optional(), tracks: z.array(z.object({ id: z.string().min(1), type: z.enum(['lithology', 'intervals', 'curve']), curveId: z.string().optional(), width: num.min(2).max(80) })).max(12).optional(), curveSettings: z.record(z.string(), z.object({ visible: z.boolean(), min: num, max: num, from: num.nonnegative(), to: positive })).optional() })).optional(), wellDecorations: z.record(z.string(),z.object({coreColor:z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),filterFrom:num.nonnegative().optional(),filterTo:num.nonnegative().optional()})).optional() })),
  contourEdits: z.record(z.string(), z.array(z.object({ anchorId: z.string(), side: z.enum(['left', 'right']), x: num, z: num, boundary: z.boolean(), boundaryTop: num.optional(), boundaryBottom: num.optional() }))).optional(),
  arcEdits: z.record(z.string(), z.array(z.object({ linkId: z.string(), edge: z.enum(['top', 'bottom']), points: z.array(xz), smooth: z.boolean() }))).optional(),
  contourArcEdits: z.record(z.string(), z.array(z.object({ ringKey: z.string().min(1), start: num.int().nonnegative(), end: num.int().nonnegative(), route: z.enum(['short', 'long']), operation: z.enum(['smooth', 'straight']) }))).optional(),
  bottomExtensions: z.record(z.string(), num).optional(),
  metadata: z.object({ geoBlock: z.string().max(120).optional(), techBlock: z.string().max(120).optional(), mapProfileGroup: z.string().max(120).optional(), mapProfileOrder: num.int().optional(), depositBody: z.string().max(120), createdOn: z.string().refine(v => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), compiledBy: z.string().max(120), checkedBy: z.string().max(120) }).optional(),
  smoothLayers: z.array(z.enum(['technology', 'ore', 'uncorrected', 'offbalance'])).optional(),
  columnSettings: z.record(z.string(), z.object({ width: num.min(2).max(40), offset: num, lithology: z.boolean(), intervals: z.boolean(), curves: z.boolean(), curveMin: num, curveMax: num, curvesFirst: z.boolean().optional(), tracks: z.array(z.object({ id: z.string().min(1), type: z.enum(['lithology', 'intervals', 'curve']), curveId: z.string().optional(), width: num.min(2).max(80) })).max(12).optional(), curveSettings: z.record(z.string(), z.object({ visible: z.boolean(), min: num, max: num, from: num.nonnegative(), to: positive })).optional() })).optional(),
  units: z.array(z.object({ id: z.string(), name: z.string().trim().min(1), description: z.string() })).optional(),
  auxiliary: z.array(z.object({ id: z.string(), wellId: z.string(), layer: z.enum(['technology', 'ore', 'uncorrected', 'offbalance']), from: num.nonnegative(), to: positive, sharedId: z.string().min(1).optional(), sourceRevision: positive.int().optional() })).optional(),
  sourceOverrides: z.record(z.string(), z.object({ revision: positive.int(), technology: sourceIntervals, ore: sourceIntervals, uncorrected: sourceIntervals, offbalance: sourceIntervals })).optional(),
})
export function canEditSection(persona: UserPersona | null, section: GeologySection) {
  return hasPermission(persona, 'geology.sections.edit') && section.scope === 'geology-section-prototype' && section.depositId === 'GTR-LOCAL-NORTH' && section.status === 'draft'
}
export function validateSection(value: unknown): GeologySection {
  const result = schema.safeParse(value)
  if (!result.success) throw new Error('Разрез содержит некорректные или несовместимые данные. Проверьте обязательные поля.')
  const section = retireRhythms(result.data)
  const issues = profileIssues(section.profile)
  issues.push(...segmentMembershipIssues(section))
  if (issues.length) throw new Error(issues.join(' '))
  if (section.top <= section.bottom) throw new Error('Верхняя отметка должна быть выше нижней.')
  if (new Set(section.wellIds).size !== section.wellIds.length || section.wellIds.some(id => !sectionSources(section).some(w => w.id === id))) throw new Error('Состав скважин содержит неизвестные или повторяющиеся объекты.')
  for (const [layer, wellIds] of Object.entries(section.participation)) {
    if (new Set(wellIds).size !== wellIds.length || wellIds.some(id => !section.wellIds.includes(id))) throw new Error('Участвующие скважины должны входить в разрез.')
    const layerLinks = section.links[layer as keyof typeof section.links]
    if (new Set(layerLinks.map(l => l.id)).size !== layerLinks.length) throw new Error('Повторяются идентификаторы связей.')
  }
  if (new Set(section.graphics.map(g => g.id)).size !== section.graphics.length || new Set(section.drawings.map(d => d.id)).size !== section.drawings.length) throw new Error('Повторяются идентификаторы графики/чертежей.')
  for (const objects of [section.auxiliary ?? []]) if (new Set(objects.map(o => o.id)).size !== objects.length) throw new Error('Повторяются идентификаторы вспомогательных объектов.')
  for (const layer of ['technology', 'ore', 'uncorrected', 'offbalance'] as const) {
    const errors = [...correlationIssues(section, layer), ...contourArcIssues(section, layer)]
    if (errors.length) throw new Error(errors.join(' '))
  }
  for (const graphic of section.graphics) { const errors = graphicIssues(graphic, section); if (errors.length) throw new Error(errors.join(' ')) }
  for (const [id, column] of Object.entries(section.columnSettings ?? {})) {
    const well = sectionSources(section).find(w => w.id === id) ?? (id === 'all' ? sectionSources(section)[0] : undefined)
    if (!well) throw new Error('Настройки колонок ссылаются на неизвестную скважину.')
    const errors = trackIssues(column, well); if (errors.length) throw new Error(errors.join(' '))
    if (column.curveMin >= column.curveMax) throw new Error('Минимум шкалы должен быть меньше максимума.')
    for (const curve of Object.values(column.curveSettings ?? {})) if (curve.min >= curve.max || curve.from >= curve.to) throw new Error('Проверьте шкалу и глубинный диапазон каротажа.')
  }
  for (const aux of section.auxiliary ?? []) { const well = sectionSources(section).find(w => w.id === aux.wellId); if (!well || !section.wellIds.includes(aux.wellId) || aux.to <= aux.from || virtualStationAtDepth(section, well, aux.to).z < section.bottom) throw new Error('Вспомогательный интервал выходит за рабочие высоты разреза.') }
  const allAnchors = (['technology', 'ore', 'uncorrected', 'offbalance'] as const).flatMap(layer => layerAnchors(section, layer))
  if (Object.keys(section.bottomExtensions ?? {}).some(id => !allAnchors.some(a => a.id === id))) throw new Error('Продолжение ссылается на удалённый интервал.')
  for (const [id, source] of Object.entries(section.sourceOverrides ?? {})) {
    const well = sectionSources(section).find(w => w.id === id)
    if (!well || !section.wellIds.includes(id)) throw new Error('Источник не входит в разрез.')
    for (const layer of ['technology', 'ore', 'uncorrected', 'offbalance'] as const) {
      const intervals = source[layer]
      if (!Array.isArray(intervals) || new Set(intervals.map(i => i.id)).size !== intervals.length || intervals.some(i => i.to <= i.from || i.to > well.depth)) throw new Error('Некорректные исходные интервалы.')
    }
  }
  for (const d of section.drawings) if (d.top <= d.bottom || d.top > section.top || d.bottom < section.bottom || d.right <= d.left || d.left < 0 || d.right > profileLength(section.profile) + 1e-6 || d.margin < 5 || d.margin > 40) throw new Error('Проверьте диапазон, поля и высоты чертежа.')
  return section
}
function read(): GeologySection[] {
  const raw = localStorage.getItem(SECTION_STORAGE_KEY)
  if (!raw) return initialSections()
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('Формат локального реестра не поддерживается.')
    const docs = parsed.map(validateSection)
    if (new Set(docs.map(s => s.id)).size !== docs.length) throw new Error('В реестре повторяются ID разрезов.')
    return docs
  } catch (error) { throw new Error('Не удалось прочитать локальный реестр разрезов. Исходные сохранения оставлены без изменений.', { cause: error }) }
}
function write(docs: GeologySection[]) { localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(docs)) }
export const sectionRepository = {
  async list() { return read() },
  /** Refresh only the shared presentation fixture; independent documents stay intact. */
  async demoList() {
    const docs = read(), previous = docs.find(doc => doc.id === 'GTR-01')
    if (!previous) return docs
    const reference = referenceSection()
    const needsMapLayout = !previous.mapGeometry && JSON.stringify(previous.profile) === JSON.stringify(reference.profile)
    const existingParallel = docs.find(doc => doc.id === 'GTR-02')
    if (!needsMapLayout && previous.demoPreset === 'video-reference-v3' && previous.metadata?.mapProfileGroup === 'north-demo' && existingParallel?.metadata?.mapProfileGroup === 'north-demo') return docs
    const hadSavedDocument = localStorage.getItem(SECTION_STORAGE_KEY) !== null
    const next = previous.demoPreset === 'video-reference-v2' || previous.demoPreset === 'video-reference-v3'
      ? validateSection({ ...previous, mapGeometry: needsMapLayout ? reference.mapGeometry : previous.mapGeometry, demoPreset: 'video-reference-v3', revision: previous.revision + (hadSavedDocument ? 1 : 0), metadata: { ...previous.metadata, geoBlock: previous.metadata?.geoBlock || 'ГБ-01', techBlock: previous.metadata?.techBlock || 'ТБ-01', mapProfileGroup: 'north-demo', mapProfileOrder: 1 } })
      : validateSection({ ...referenceSection(), title: previous.title, status: previous.status, revision: hadSavedDocument ? previous.revision + 1 : 0 })
    if (hadSavedDocument && !localStorage.getItem(SECTION_DEMO_BACKUP_KEY)) localStorage.setItem(SECTION_DEMO_BACKUP_KEY, JSON.stringify(previous))
    const updated = docs.map(doc => {
      if (doc.id === previous.id) return next
      if (doc.id === 'GTR-02' && doc.status === 'locked' && !doc.metadata?.mapProfileGroup) {
        return validateSection({ ...doc, profile: [{ x: 0, y: 75 }, { x: 160, y: 78 }, { x: 350, y: 74 }], revision: doc.revision + (hadSavedDocument ? 1 : 0), metadata: { ...doc.metadata, mapProfileGroup: 'north-demo', mapProfileOrder: 2, depositBody: doc.metadata?.depositBody ?? '', createdOn: doc.metadata?.createdOn ?? '', compiledBy: doc.metadata?.compiledBy ?? '', checkedBy: doc.metadata?.checkedBy ?? '' } })
      }
      return doc
    })
    write(updated)
    return updated
  },
  create(input: GeologySection, persona: UserPersona | null) {
    if (!canEditSection(persona, input)) throw new Error('Недостаточно прав для создания разреза.')
    const docs = read(), next = validateSection(input)
    validateSharedSnapshots(next)
    if (docs.some(d => d.id === next.id || d.title.toLocaleLowerCase() === next.title.toLocaleLowerCase())) throw new Error('Разрез с таким названием или ID уже существует.')
    write([...docs, next]); return next
  },
  save(input: GeologySection, expectedRevision: number, persona: UserPersona | null) {
    const docs = read(), current = docs.find(d => d.id === input.id)
    if (!current || !canEditSection(persona, current)) throw new Error('Разрез доступен только для просмотра.')
    if (current.revision !== expectedRevision) throw new Error('Разрез изменён в другой вкладке браузера. Повторно откройте его, сохранив свой черновик отдельно.')
    const checked = validateSection({ ...input, revision: expectedRevision + 1 })
    validateSharedSnapshots(checked)
    const next = { ...checked, graphics: checked.graphics.map(g => g.contourLinks?.length ? { ...g, contourSnapshot: resolveGraphicPoints(g, checked) } : g) }
    if (docs.some(d => d.id !== next.id && d.title.toLocaleLowerCase() === next.title.toLocaleLowerCase())) throw new Error('Название разреза уже используется.')
    write(docs.map(d => d.id === next.id ? next : d)); return next
  },
  remove(id: string, expectedRevision: number, persona: UserPersona | null) {
    const docs = read(), current = docs.find(d => d.id === id)
    if (!current || !canEditSection(persona, current) || !hasPermission(persona, 'geology.sections.delete')) throw new Error('Удаление разреза недоступно.')
    if (current.revision !== expectedRevision) throw new Error('Разрез изменён: повторно откройте его перед удалением.')
    if (current.drawings.length) throw new Error('Сначала удалите связанные варианты чертежа.')
    write(docs.filter(d => d.id !== id))
  },
}
