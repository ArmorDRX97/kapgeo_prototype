import type { AlphaDocument, DepthInterval, ElectroInterval, OreInterval, RockCode } from '../model/alphaTypes'
import type { InterpretationWell } from '../model/types'
import { assertDepth, integrate, rounded } from './alphaNumeric'
import { alphaFingerprint, electroMetrics, oreMetrics, sourceRecord } from './alphaCalculations'
import { moveContact, overwriteInterval } from './commands'
import { gammaCurve, refineOreInterval } from './alphaGamma'
import { ALPHA_CALC_VERSION } from '../model/alphaVersion'

export type EditableAlphaKey = 'electro' | 'gamma' | 'thermal' | 'caliper' | 'oxidation' | 'sections' | 'projects'
export function editableRows(doc: AlphaDocument, key: EditableAlphaKey): DepthInterval[] {
  return key === 'oxidation' || key === 'sections' || key === 'projects' ? doc[key] : doc[key].rows
}
type ManualInterval = DepthInterval & { rock?: RockCode; lithologyCode?: string; geochemistryCode?: string; kf?: number; manualKf?: boolean; morphology?: OreInterval['morphology']; kind?: 'filter' | 'bentonite'; label?: string }
function install(well: InterpretationWell, before: AlphaDocument, key: EditableAlphaKey, rows: ManualInterval[]) {
  const next = structuredClone(before)
  const plain = rows.map(({ id, from, to }) => ({ id, from, to }))
  if (key === 'electro') next.electro.rows = rows.map((r, i) => ({ ...electroMetrics(well, next, plain[i]!, r.rock, r.manualKf ? r.kf : undefined), ...(r.lithologyCode !== undefined ? { lithologyCode: r.lithologyCode } : {}), ...(r.geochemistryCode !== undefined ? { geochemistryCode: r.geochemistryCode } : {}) }))
  else if (key === 'gamma') { const record = gammaCurve(well, next); next.gamma.rows = rows.map((r, i) => oreMetrics(well, next, plain[i]!, r.morphology, record)) }
  else if (key === 'caliper') next.caliper.rows = plain.map(r => { const s = integrate(sourceRecord(well, next, next.parameters.caliper.recordId, 'CAL'), r.from, r.to); return { ...r, mean: s.mean === null ? null : rounded(s.mean), minimum: s.minimum === null ? null : rounded(s.minimum) } })
  else if (key === 'thermal') next.thermal.rows = plain
  else if (key === 'projects') next.projects = rows.map((r, i) => ({ ...plain[i]!, label: r.label ?? 'Бентогильзы', kind: r.kind ?? 'bentonite' }))
  else next[key] = plain
  if (key === 'electro' || key === 'gamma' || key === 'thermal' || key === 'caliper') {
    next[key].fingerprint = alphaFingerprint(well, next, key); next[key].version = ALPHA_CALC_VERSION
    next[key].note = 'Ручные границы/свойства. Показатели пересчитаны по текущему локальному профилю; проверьте построение перед сохранением.'
  }
  return next
}
export function editAlphaInterval(well: InterpretationWell, doc: AlphaDocument, key: EditableAlphaKey, row: ManualInterval) {
  assertDepth(row.from, row.to, well.depth)
  const previous = editableRows(doc, key) as ManualInterval[]
  if (key === 'sections') {
    const filter = doc.current.rows.find(r => r.id === 'actual-filter')
    if (!filter || row.from < filter.from || row.to > filter.to) throw new Error('Секция должна находиться внутри фактического фильтра.')
    const sorted = [...previous].sort((a, b) => a.from - b.from), index = sorted.findIndex(r => r.id === row.id)
    if (index >= 0) {
      if (index === 0 && row.from !== filter.from || index === sorted.length - 1 && row.to !== filter.to) throw new Error('Крайние границы секций задаются фактическим фильтром ТК.')
      let adjusted = sorted
      if (index > 0) adjusted = moveContact(adjusted, row.id, 'from', row.from, well.depth)
      if (index < sorted.length - 1) adjusted = moveContact(adjusted, row.id, 'to', row.to, well.depth)
      return install(well, doc, key, adjusted)
    }
  }
  const rows = key === 'projects' ? [...previous.filter(r => r.id !== row.id), row].sort((a, b) => a.from - b.from) : overwriteInterval(previous, row, well.depth, () => false)
  return install(well, doc, key, rows)
}
export function changeAlphaContact(well: InterpretationWell, doc: AlphaDocument, key: EditableAlphaKey, id: string, edge: 'from' | 'to', depth: number) {
  if (key === 'sections') {
    const filter = doc.current.rows.find(r => r.id === 'actual-filter'), sorted = [...doc.sections].sort((a, b) => a.from - b.from)
    if (!filter || edge === 'from' && id === sorted[0]?.id || edge === 'to' && id === sorted.at(-1)?.id) throw new Error('Крайние границы секций задаются фактическим фильтром ТК.')
  }
  return install(well, doc, key, moveContact(editableRows(doc, key) as ManualInterval[], id, edge, rounded(depth, 1), well.depth))
}
export function splitAlphaInterval(well: InterpretationWell, doc: AlphaDocument, key: EditableAlphaKey, id: string, depth: number) {
  const rows = editableRows(doc, key) as ManualInterval[], row = rows.find(r => r.id === id)
  if (!row || depth - row.from < 0.1 || row.to - depth < 0.1) throw new Error('Разделение оставляет две части мощностью не менее 0,1 м.')
  return install(well, doc, key, rows.flatMap(r => r.id === id ? [{ ...r, to: depth }, { ...r, id: `${r.id}-split-${depth}`, from: depth }] : [r]))
}
export function cutAlphaInterval(well: InterpretationWell, doc: AlphaDocument, key: EditableAlphaKey, id: string, from: number, to: number) {
  assertDepth(from, to, well.depth)
  const rows = editableRows(doc, key) as ManualInterval[], row = rows.find(r => r.id === id)
  if (key === 'sections') throw new Error('Секции фильтра должны покрывать весь фильтр. Используйте разделение или объединение.')
  if (!row || from - row.from < 0.1 || row.to - to < 0.1) throw new Error('Вырезаемая часть должна быть внутри объекта и оставлять две части не менее 0,1 м.')
  return install(well, doc, key, rows.flatMap(r => r.id === id ? [{ ...r, to: from }, { ...r, id: `${id}-cut-${to}`, from: to }] : [r]))
}
export function refineAlphaOre(well: InterpretationWell, doc: AlphaDocument, row: DepthInterval, morphology: OreInterval['morphology']) {
  const applied = editAlphaInterval(well, doc, 'gamma', { ...row, morphology }), interval = applied.gamma.rows.find(r => r.id === row.id)!
  const refined = refineOreInterval(well, applied, interval, morphology)
  return install(well, applied, 'gamma', [...applied.gamma.rows.filter(r => r.id !== row.id), ...refined].sort((a, b) => a.from - b.from))
}
export function mergeAlphaInterval(well: InterpretationWell, doc: AlphaDocument, key: EditableAlphaKey, id: string, direction: 'above' | 'below') {
  const rows = [...editableRows(doc, key)].sort((a, b) => a.from - b.from) as ManualInterval[], index = rows.findIndex(r => r.id === id), row = rows[index], neighbour = rows[index + (direction === 'above' ? -1 : 1)]
  if (!row || !neighbour) throw new Error('Соседний интервал отсутствует.')
  const merged = { ...row, from: Math.min(row.from, neighbour.from), to: Math.max(row.to, neighbour.to) }
  return install(well, doc, key, [...rows.filter(r => r.id !== id && r.id !== neighbour.id), merged].sort((a, b) => a.from - b.from))
}
export function removeAlphaInterval(well: InterpretationWell, doc: AlphaDocument, key: EditableAlphaKey, id: string) {
  if (key === 'sections') {
    const rows = [...doc.sections].sort((a, b) => a.from - b.from), index = rows.findIndex(r => r.id === id), row = rows[index], neighbour = rows[index > 0 ? index - 1 : index + 1]
    if (!row || !neighbour) throw new Error('У фильтра должна оставаться хотя бы одна секция.')
    return install(well, doc, key, rows.filter(r => r.id !== id).map(r => r.id === neighbour.id ? { ...r, from: Math.min(row.from, r.from), to: Math.max(row.to, r.to) } : r))
  }
  return install(well, doc, key, (editableRows(doc, key) as ManualInterval[]).filter(r => r.id !== id))
}
export function setPaleozoic(well: InterpretationWell, doc: AlphaDocument, depth: number) {
  assertDepth(depth, well.depth, well.depth)
  return editAlphaInterval(well, doc, 'electro', { id: `paleozoic-${depth}`, from: depth, to: well.depth, rock: 'paleozoic', manualKf: true, kf: 0 })
}
export function regenerateSections(doc: AlphaDocument, count: number) {
  const filter = doc.current.rows.find(r => r.id === 'actual-filter')
  if (!filter || !Number.isInteger(count) || count < 1 || count > 20 || filter.to - filter.from < count * 0.1) throw new Error('Выберите от 1 до 20 секций мощностью не менее 0,1 м для существующего фактического фильтра.')
  return { ...doc, sections: Array.from({ length: count }, (_, i) => ({ id: `filter-section-${i + 1}`, from: rounded(filter.from + (filter.to - filter.from) * i / count), to: i === count - 1 ? filter.to : rounded(filter.from + (filter.to - filter.from) * (i + 1) / count) })) }
}
/** Keep section ends on the newly applied actual filter, preserving inner contacts. */
export function fitFilterSections(doc: AlphaDocument): AlphaDocument {
  const filter = doc.current.rows.find(r => r.id === 'actual-filter')
  if (!filter) return { ...doc, sections: [] }
  const sections = doc.sections.map(r => ({ ...r, from: Math.max(filter.from, r.from), to: Math.min(filter.to, r.to) }))
    .filter(r => r.to - r.from >= 0.1).sort((a, b) => a.from - b.from)
  if (!sections.length) return regenerateSections(doc, 3)
  sections[0]!.from = filter.from; sections[sections.length - 1]!.to = filter.to
  return { ...doc, sections }
}
export function intervalKey(page: string, sub: string): EditableAlphaKey | null {
  if (page === 'gamma' && sub === 'oxidation') return 'oxidation'
  if (page === 'thermal' && sub === 'projects') return 'projects'
  if (page === 'thermal' && sub === 'induction') return null
  if (page === 'flow') return 'sections'
  return ['electro', 'gamma', 'thermal', 'caliper'].includes(page) ? page as EditableAlphaKey : null
}
export function validateManualFiltration(row: Pick<ElectroInterval, 'manualKf' | 'kf'>) {
  if (row.manualKf && (!Number.isFinite(row.kf) || row.kf < 0)) throw new Error('Ручной Кф должен быть неотрицательным.')
}
